/**
 * Backend SIMULADO de contas — usado APENAS em testes automatizados e no modo de desenvolvimento
 * (npm run dev sem Supabase configurado). Não é incluído no build de produção.
 *
 * Reproduz as regras do backend real (e-mail único, confirmação por link, aceites obrigatórios,
 * nome de usuário único, reautenticação recente para excluir a conta, isolamento por conta) para que
 * os fluxos da interface possam ser testados sem um projeto Supabase. Os "e-mails" enviados ficam
 * numa caixa de saída consultável (outbox).
 */
import type { KeyValueStorage } from '../core/SaveManager';
import type { SaveData } from '../core/types';
import { accountError } from './errors';
import type { AccountProfile, AuthBackend, AuthEvent, AuthUser, CloudSave, ProfessionalProfile, SignUpInput, SignUpResult } from './types';
import { USERNAME_RE } from './validation';

interface DevUser { id: string; email: string; passwordHash: string; confirmed: boolean; createdAt: string }
interface DevConsent { user_id: string; document: string; version: string; action: string; created_at: string }
interface DevDb {
  users: DevUser[];
  profiles: AccountProfile[];
  consents: DevConsent[];
  saves: Record<string, CloudSave>;
  tokens: Record<string, { userId: string; type: 'signup' | 'recovery' }>;
  outbox: { to: string; type: 'signup' | 'recovery'; token: string; at: string }[];
}
interface DevSession { userId: string; authAt: number; recovery?: boolean }

const DB_KEY = 'aurora.devAuth.db';
const SESSION_KEY = 'aurora.devAuth.session';

/** hash simples e determinístico — suficiente para a simulação (o backend real usa bcrypt no servidor) */
function devHash(s: string): string {
  let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  return `dev$${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

let seq = 0;
const newId = () => `dev-${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export class DevBackend implements AuthBackend {
  readonly kind = 'dev' as const;
  private listeners = new Set<(e: AuthEvent, u: AuthUser | null) => void>();
  /** simula o limite de taxa do servidor (ex.: o Supabase limita tentativas por IP) */
  serverFailures = 0;

  constructor(private storage: KeyValueStorage, private now: () => number = Date.now) {}

  // ---------------------------------------------------------------- persistência da simulação
  private db(): DevDb {
    try {
      const d = JSON.parse(this.storage.getItem(DB_KEY) ?? '') as DevDb;
      if (d && Array.isArray(d.users)) return d;
    } catch { /* novo */ }
    return { users: [], profiles: [], consents: [], saves: {}, tokens: {}, outbox: [] };
  }
  private write(d: DevDb): void { this.storage.setItem(DB_KEY, JSON.stringify(d)); }
  private session(): DevSession | null {
    try { return JSON.parse(this.storage.getItem(SESSION_KEY) ?? 'null'); } catch { return null; }
  }
  private setSession(s: DevSession | null): void {
    if (s) this.storage.setItem(SESSION_KEY, JSON.stringify(s));
    else this.storage.removeItem(SESSION_KEY);
  }
  private emit(e: AuthEvent): void {
    const u = this.currentUser();
    this.listeners.forEach((cb) => setTimeout(() => cb(e, u), 0));
  }
  private currentUser(): AuthUser | null {
    const s = this.session();
    const u = s && this.db().users.find((x) => x.id === s.userId);
    return u ? { id: u.id, email: u.email, createdAt: u.createdAt } : null;
  }
  private requireUser(): DevUser {
    const s = this.session();
    const u = s && this.db().users.find((x) => x.id === s.userId);
    if (!u) throw accountError('not_authenticated');
    return u;
  }
  private consent(d: DevDb, userId: string, document: string, version: string, action: string): void {
    d.consents.push({ user_id: userId, document, version, action, created_at: new Date(this.now()).toISOString() });
  }

  /** caixa de saída de e-mails simulados (para os testes e para o painel do modo de desenvolvimento) */
  outbox(): DevDb['outbox'] { return this.db().outbox; }
  /** simula o clique no link recebido por e-mail */
  async openEmailLink(token: string): Promise<AuthEvent> {
    const d = this.db();
    const t = d.tokens[token];
    if (!t) throw accountError('unknown', undefined, 'Link inválido ou já utilizado.');
    delete d.tokens[token];
    const u = d.users.find((x) => x.id === t.userId);
    if (!u) throw accountError('unknown', undefined, 'Link inválido.');
    if (t.type === 'signup') u.confirmed = true;
    this.write(d);
    this.setSession({ userId: u.id, authAt: this.now(), recovery: t.type === 'recovery' });
    const ev: AuthEvent = t.type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN';
    this.emit(ev);
    return ev;
  }
  /** acesso de inspeção para os testes (o jogo nunca usa) */
  inspect(): DevDb { return this.db(); }

  // ---------------------------------------------------------------- AuthBackend
  async getUser(): Promise<AuthUser | null> { return this.currentUser(); }

  onAuthEvent(cb: (e: AuthEvent, u: AuthUser | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async signUp(i: SignUpInput, v: { terms: string; privacy: string }): Promise<SignUpResult> {
    const d = this.db();
    const email = i.email.trim().toLowerCase();
    if (d.users.some((u) => u.email === email)) throw accountError('email_in_use', 'email');
    if (!USERNAME_RE.test(i.username.trim())) throw accountError('signup_rejected');
    if (d.profiles.some((p) => p.username.toLowerCase() === i.username.trim().toLowerCase())) throw accountError('username_in_use', 'username');
    if (!i.professionalProfile || !i.termsAccepted || !i.privacyAcknowledged || !i.adultDeclared) throw accountError('signup_rejected');
    if (i.password.length < 8) throw accountError('weak_password', 'password');
    const id = newId();
    const createdAt = new Date(this.now()).toISOString();
    d.users.push({ id, email, passwordHash: devHash(i.password), confirmed: false, createdAt });
    d.profiles.push({
      id, username: i.username.trim(), professional_profile: i.professionalProfile, marketing_opt_in: i.marketingOptIn,
      terms_version: v.terms, privacy_version: v.privacy, educational_notice_version: null, educational_notice_ack_at: null, created_at: createdAt,
    });
    this.consent(d, id, 'termos_de_uso', v.terms, 'aceite');
    this.consent(d, id, 'politica_de_privacidade', v.privacy, 'ciencia');
    this.consent(d, id, 'maioridade', v.terms, 'declaracao');
    if (i.marketingOptIn) this.consent(d, id, 'comunicacoes', v.privacy, 'consentimento');
    const token = newId();
    d.tokens[token] = { userId: id, type: 'signup' };
    d.outbox.push({ to: email, type: 'signup', token, at: createdAt });
    this.write(d);
    return { needsConfirmation: true };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    if (this.serverFailures >= 30) throw accountError('rate_limited');
    const u = this.db().users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.passwordHash !== devHash(password)) { this.serverFailures++; throw accountError('invalid_credentials'); }
    if (!u.confirmed) throw accountError('email_not_confirmed');
    this.setSession({ userId: u.id, authAt: this.now() });
    this.emit('SIGNED_IN');
    return { id: u.id, email: u.email, createdAt: u.createdAt };
  }

  async signOut(): Promise<void> {
    this.setSession(null);
    this.emit('SIGNED_OUT');
  }

  async resendConfirmation(email: string): Promise<void> {
    const d = this.db();
    const u = d.users.find((x) => x.email === email.trim().toLowerCase() && !x.confirmed);
    if (!u) return; // não revela se o e-mail existe
    const token = newId();
    d.tokens[token] = { userId: u.id, type: 'signup' };
    d.outbox.push({ to: u.email, type: 'signup', token, at: new Date(this.now()).toISOString() });
    this.write(d);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const d = this.db();
    const u = d.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u) return; // não revela se o e-mail existe
    const token = newId();
    d.tokens[token] = { userId: u.id, type: 'recovery' };
    d.outbox.push({ to: u.email, type: 'recovery', token, at: new Date(this.now()).toISOString() });
    this.write(d);
  }

  async updatePassword(newPassword: string): Promise<void> {
    const s = this.session();
    const d = this.db();
    const u = s && d.users.find((x) => x.id === s.userId);
    if (!u || !s) throw accountError('not_authenticated');
    if (!s.recovery && this.now() - s.authAt > 10 * 60 * 1000) throw accountError('reauth_required');
    if (u.passwordHash === devHash(newPassword)) throw accountError('same_password', 'password');
    if (newPassword.length < 8) throw accountError('weak_password', 'password');
    u.passwordHash = devHash(newPassword);
    this.write(d);
    this.setSession({ userId: u.id, authAt: this.now() });
    this.emit('USER_UPDATED');
  }

  async reauthenticate(password: string): Promise<void> {
    const u = this.requireUser();
    if (u.passwordHash !== devHash(password)) throw accountError('invalid_credentials', 'password', 'Senha atual incorreta.');
    this.setSession({ userId: u.id, authAt: this.now() });
  }

  async usernameAvailable(username: string): Promise<boolean> {
    const n = username.trim();
    return USERNAME_RE.test(n) && !this.db().profiles.some((p) => p.username.toLowerCase() === n.toLowerCase());
  }

  async getProfile(): Promise<AccountProfile | null> {
    const u = this.requireUser();
    return this.db().profiles.find((p) => p.id === u.id) ?? null;
  }

  async updateProfile(patch: { username?: string; professional_profile?: ProfessionalProfile }): Promise<AccountProfile> {
    const u = this.requireUser();
    const d = this.db();
    const p = d.profiles.find((x) => x.id === u.id)!;
    if (patch.username !== undefined) {
      const n = patch.username.trim();
      if (!USERNAME_RE.test(n)) throw accountError('invalid_input', 'username');
      if (d.profiles.some((x) => x.id !== u.id && x.username.toLowerCase() === n.toLowerCase())) throw accountError('username_in_use', 'username');
      p.username = n;
    }
    if (patch.professional_profile) p.professional_profile = patch.professional_profile;
    this.write(d);
    return p;
  }

  async acceptDocuments(terms: string, privacy: string): Promise<void> {
    const u = this.requireUser();
    const d = this.db();
    this.consent(d, u.id, 'termos_de_uso', terms, 'aceite');
    this.consent(d, u.id, 'politica_de_privacidade', privacy, 'ciencia');
    const p = d.profiles.find((x) => x.id === u.id)!;
    p.terms_version = terms; p.privacy_version = privacy;
    this.write(d);
  }

  async acknowledgeEducationalNotice(version: string): Promise<void> {
    const u = this.requireUser();
    const d = this.db();
    this.consent(d, u.id, 'aviso_educacional', version, 'ciencia');
    const p = d.profiles.find((x) => x.id === u.id)!;
    p.educational_notice_version = version;
    p.educational_notice_ack_at = new Date(this.now()).toISOString();
    this.write(d);
  }

  async setMarketingConsent(optIn: boolean, version: string): Promise<void> {
    const u = this.requireUser();
    const d = this.db();
    this.consent(d, u.id, 'comunicacoes', version, optIn ? 'consentimento' : 'revogacao');
    d.profiles.find((x) => x.id === u.id)!.marketing_opt_in = optIn;
    this.write(d);
  }

  async loadSave(): Promise<CloudSave | null> {
    const u = this.requireUser();
    return this.db().saves[u.id] ?? null;
  }

  async storeSave(data: SaveData, clientUpdatedAt: number): Promise<void> {
    const u = this.requireUser();
    const d = this.db();
    d.saves[u.id] = { data: JSON.parse(JSON.stringify(data)), clientUpdatedAt };
    this.write(d);
  }

  async deleteSave(): Promise<void> {
    const u = this.requireUser();
    const d = this.db();
    delete d.saves[u.id];
    this.write(d);
  }

  /** usado pelos testes para simular uma conta tentando ler o progresso de outra pela API */
  async loadSaveOf(userId: string): Promise<CloudSave | null> {
    const u = this.requireUser();
    if (u.id !== userId) return null; // mesma regra das políticas RLS: só os próprios dados
    return this.db().saves[userId] ?? null;
  }

  async exportData(): Promise<unknown> {
    const u = this.requireUser();
    const d = this.db();
    return {
      gerado_em: new Date(this.now()).toISOString(),
      conta: { id: u.id, email: u.email, criada_em: u.createdAt },
      perfil: d.profiles.find((p) => p.id === u.id) ?? null,
      registros_de_aceite: d.consents.filter((c) => c.user_id === u.id),
      progresso_do_jogo: d.saves[u.id] ?? null,
    };
  }

  async deleteAccount(): Promise<void> {
    const s = this.session();
    const u = this.requireUser();
    if (!s || this.now() - s.authAt > 10 * 60 * 1000) throw accountError('reauth_required');
    const d = this.db();
    d.users = d.users.filter((x) => x.id !== u.id);
    d.profiles = d.profiles.filter((x) => x.id !== u.id);
    d.consents = d.consents.filter((x) => x.user_id !== u.id);
    delete d.saves[u.id];
    this.write(d);
    await this.signOut();
  }
}
