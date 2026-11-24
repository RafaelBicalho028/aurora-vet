/**
 * Serviço de conta: une o backend de autenticação ao jogo.
 * - Cadastro (validação + nome de usuário disponível + aceites), login com freio de tentativas, logout.
 * - Perfil, aceites de documentos e aviso educacional.
 * - Progresso vinculado à conta: cópia local por conta + sincronização com o banco (última gravação vence).
 * - Migração segura do progresso antigo deste navegador, com verificação antes de considerar concluída.
 */
import type { SaveData } from '../core/types';
import { isValidSave, migrate, type KeyValueStorage, type SaveManager } from '../core/SaveManager';
import { accountError, normalizeError } from './errors';
import { LoginThrottle, formatWait } from './throttle';
import type { AccountProfile, AuthBackend, AuthUser, ProfessionalProfile, SignUpInput, SignUpResult } from './types';
import { hasErrors, validateEmail, validatePassword, validatePasswordConfirm, validateSignUp, validateUsername, type FieldErrors } from './validation';
import { EDUCATIONAL_NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '../content/legal';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export class SignUpValidationError extends Error {
  constructor(public fields: FieldErrors) { super('validation'); }
}

const MIGRATED_KEY = 'aurora.legacyMigrated';

export class AccountService {
  user: AuthUser | null = null;
  profile: AccountProfile | null = null;
  syncStatus: SyncStatus = 'idle';
  onSyncStatus: ((s: SyncStatus) => void) | null = null;
  private throttle: LoginThrottle;
  private pending: SaveData | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<void> | null = null;

  constructor(readonly backend: AuthBackend, private saver: SaveManager, private storage: KeyValueStorage, private debounceMs = 1500) {
    this.throttle = new LoginThrottle(storage);
    saver.onPersist = (d) => this.queueSave(d);
    saver.onClear = () => { void this.backend.deleteSave().catch((e) => console.warn('[Aurora Vet] apagar progresso na conta', e)); };
  }

  // ---------------------------------------------------------------- sessão
  /** Restaura a sessão salva neste aparelho (se houver). */
  async restore(): Promise<AuthUser | null> {
    this.user = await this.backend.getUser();
    if (this.user) this.saver.setAccount(this.user.id);
    return this.user;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const errs = validateSignUp(input);
    if (hasErrors(errs)) throw new SignUpValidationError(errs);
    let available = true;
    try { available = await this.backend.usernameAvailable(input.username); } catch (e) { throw normalizeError(e); }
    if (!available) throw new SignUpValidationError({ username: 'Este nome de usuário já está em uso. Escolha outro.' });
    try {
      const r = await this.backend.signUp(input, { terms: TERMS_VERSION, privacy: PRIVACY_VERSION });
      // sem confirmação de e-mail, o cadastro já abre a sessão
      if (!r.needsConfirmation) await this.restore();
      return r;
    } catch (e) {
      const err = normalizeError(e);
      if (err.field) throw new SignUpValidationError({ [err.field]: err.message } as FieldErrors);
      throw err;
    }
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const wait = this.throttle.remainingMs();
    if (wait > 0) throw accountError('locked', undefined, `Muitas tentativas seguidas. Tente novamente em ${formatWait(wait)}.`);
    const emailErr = validateEmail(email);
    if (emailErr) throw accountError('invalid_input', 'email', emailErr);
    if (!password) throw accountError('invalid_input', 'password', 'Digite sua senha.');
    try {
      const u = await this.backend.signIn(email, password);
      this.throttle.recordSuccess();
      this.user = u;
      this.saver.setAccount(u.id);
      return u;
    } catch (e) {
      const err = normalizeError(e);
      if (err.code === 'invalid_credentials') {
        const lock = this.throttle.recordFailure();
        if (lock > 0) throw accountError('locked', undefined, `E-mail ou senha incorretos. Por segurança, aguarde ${formatWait(lock)} antes de tentar de novo.`);
      }
      throw err;
    }
  }

  async signOut(): Promise<void> {
    await this.flush();
    await this.backend.signOut();
    this.user = null;
    this.profile = null;
    this.saver.setAccount(null);
  }

  /** O link de recuperação abre o jogo com uma sessão temporária: define a nova senha. */
  async completePasswordRecovery(password: string, confirm: string): Promise<void> {
    const e = validatePassword(password) ?? validatePasswordConfirm(password, confirm);
    if (e) throw accountError('invalid_input', 'password', e);
    await this.backend.updatePassword(password);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const e = validateEmail(email);
    if (e) throw accountError('invalid_input', 'email', e);
    await this.backend.requestPasswordReset(email);
  }

  async changePassword(current: string, next: string, confirm: string): Promise<void> {
    if (!current) throw accountError('invalid_input', 'current', 'Digite sua senha atual.');
    const e = validatePassword(next) ?? validatePasswordConfirm(next, confirm);
    if (e) throw accountError('invalid_input', 'password', e);
    if (current === next) throw accountError('same_password', 'password');
    await this.backend.reauthenticate(current);
    await this.backend.updatePassword(next);
  }

  // ---------------------------------------------------------------- perfil e documentos
  async loadProfile(): Promise<AccountProfile | null> {
    this.profile = await this.backend.getProfile();
    return this.profile;
  }

  needsDocumentAcceptance(): boolean {
    return !!this.profile && (this.profile.terms_version !== TERMS_VERSION || this.profile.privacy_version !== PRIVACY_VERSION);
  }

  needsEducationalNotice(): boolean {
    return !!this.profile && (!this.profile.educational_notice_ack_at || this.profile.educational_notice_version !== EDUCATIONAL_NOTICE_VERSION);
  }

  async acceptCurrentDocuments(): Promise<void> {
    await this.backend.acceptDocuments(TERMS_VERSION, PRIVACY_VERSION);
    await this.loadProfile();
  }

  async acknowledgeEducationalNotice(): Promise<void> {
    await this.backend.acknowledgeEducationalNotice(EDUCATIONAL_NOTICE_VERSION);
    await this.loadProfile();
  }

  async changeUsername(username: string): Promise<void> {
    const e = validateUsername(username);
    if (e) throw accountError('invalid_input', 'username', e);
    if (this.profile && username.trim().toLowerCase() !== this.profile.username.toLowerCase() && !(await this.backend.usernameAvailable(username))) {
      throw accountError('username_in_use', 'username');
    }
    this.profile = await this.backend.updateProfile({ username: username.trim() });
  }

  async changeProfessionalProfile(p: ProfessionalProfile): Promise<void> {
    this.profile = await this.backend.updateProfile({ professional_profile: p });
  }

  async setMarketingConsent(optIn: boolean): Promise<void> {
    await this.backend.setMarketingConsent(optIn, PRIVACY_VERSION);
    await this.loadProfile();
  }

  async exportData(): Promise<unknown> {
    await this.flush();
    return this.backend.exportData();
  }

  /** Exclui a conta: confirma a senha, apaga no servidor e remove a cópia local desta conta. */
  async deleteAccount(password: string): Promise<void> {
    if (!this.user) throw accountError('not_authenticated');
    const uid = this.user.id;
    this.cancelPending();
    await this.backend.reauthenticate(password);
    await this.backend.deleteAccount();
    this.saver.setAccount(uid);
    this.saver.onClear = null;
    this.saver.clear(); // apenas a cópia local DESTA conta; o progresso antigo do navegador não é tocado
    this.saver.onClear = () => { void this.backend.deleteSave().catch(() => undefined); };
    this.saver.setAccount(null);
    this.user = null;
    this.profile = null;
  }

  // ---------------------------------------------------------------- progresso na nuvem
  /**
   * Sincroniza ao entrar: usa a versão mais recente entre a cópia local desta conta e a do banco.
   * Retorna de onde veio o progresso em uso.
   */
  async syncOnLogin(): Promise<'remote' | 'local' | 'none'> {
    const local = this.saver.load();
    let remote: { data: SaveData; clientUpdatedAt: number } | null = null;
    try {
      remote = await this.backend.loadSave();
    } catch (e) {
      console.warn('[Aurora Vet] não foi possível baixar o progresso da conta', e);
      this.setStatus('offline');
      return local ? 'local' : 'none';
    }
    const remoteValid = remote && isValidSave(remote.data) ? { ...remote, data: migrate(remote.data) } : null;
    if (remoteValid && (!local || remoteValid.clientUpdatedAt >= local.updatedAt)) {
      this.saver.saveExact({ ...remoteValid.data, updatedAt: remoteValid.clientUpdatedAt });
      this.setStatus('saved');
      return 'remote';
    }
    if (local) {
      this.pending = local;
      await this.pushNow();
      return 'local';
    }
    return 'none';
  }

  private queueSave(d: SaveData): void {
    if (!this.user) return;
    this.pending = d;
    this.setStatus('saving');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.pushNow(); }, this.debounceMs);
  }

  private cancelPending(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }

  private async pushNow(): Promise<void> {
    if (this.inflight) await this.inflight.catch(() => undefined);
    const d = this.pending;
    if (!d || !this.user) return;
    this.pending = null;
    this.inflight = this.backend.storeSave(d, d.updatedAt)
      .then(() => this.setStatus('saved'))
      .catch((e) => {
        // mantém para tentar de novo na próxima gravação ou ao voltar a conexão
        if (!this.pending) this.pending = d;
        const err = normalizeError(e);
        this.setStatus(err.code === 'network' ? 'offline' : 'error');
        console.warn('[Aurora Vet] falha ao salvar na conta', e);
      })
      .finally(() => { this.inflight = null; });
    await this.inflight;
  }

  /** Envia imediatamente o que estiver pendente (ao sair, fechar a aba ou exportar). */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    await this.pushNow();
  }

  private setStatus(s: SyncStatus): void {
    this.syncStatus = s;
    this.onSyncStatus?.(s);
  }

  // ---------------------------------------------------------------- migração do progresso antigo
  /** Progresso salvo neste navegador antes das contas, ainda não vinculado a nenhuma conta. */
  legacyCandidate(): SaveData | null {
    const legacy = this.saver.loadLegacy();
    if (!legacy) return null;
    try {
      const m = JSON.parse(this.storage.getItem(MIGRATED_KEY) ?? 'null') as { at: number; updatedAt: number } | null;
      if (m && m.updatedAt === legacy.updatedAt) return null; // já vinculado (ou dispensado) nesta versão
    } catch { /* sem registro */ }
    return legacy;
  }

  /** Marca o progresso antigo como resolvido sem migrar (o jogador escolheu não vincular). */
  dismissLegacy(): void {
    const legacy = this.saver.loadLegacy();
    if (legacy) this.storage.setItem(MIGRATED_KEY, JSON.stringify({ at: Date.now(), updatedAt: legacy.updatedAt, dismissed: true }));
  }

  /**
   * Vincula o progresso antigo à conta: envia ao banco, baixa de volta e compara.
   * Só depois da verificação grava a cópia local da conta. O save antigo do navegador NÃO é apagado.
   */
  async migrateLegacy(): Promise<{ ok: boolean; message: string }> {
    const legacy = this.saver.loadLegacy();
    if (!legacy || !this.user) return { ok: false, message: 'Não há progresso antigo para vincular.' };
    this.cancelPending();
    const stamp = Date.now();
    const toUpload: SaveData = { ...legacy, updatedAt: stamp };
    try {
      await this.backend.storeSave(toUpload, stamp);
      const back = await this.backend.loadSave();
      const same = !!back && back.clientUpdatedAt === stamp && canonical(back.data) === canonical(toUpload);
      if (!same) return { ok: false, message: 'A verificação do progresso enviado falhou. Nada foi alterado no seu navegador; tente novamente.' };
    } catch (e) {
      return { ok: false, message: normalizeError(e).message };
    }
    this.saver.saveExact(toUpload);
    this.storage.setItem(MIGRATED_KEY, JSON.stringify({ at: stamp, updatedAt: legacy.updatedAt, userId: this.user.id }));
    this.setStatus('saved');
    return { ok: true, message: 'Progresso vinculado à sua conta e conferido com sucesso. A cópia antiga continua guardada neste navegador.' };
  }
}

/** JSON com chaves ordenadas, para comparar o progresso enviado com o recebido. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
