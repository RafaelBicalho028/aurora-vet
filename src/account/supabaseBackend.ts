/** Implementação real do serviço de contas com Supabase Auth + PostgreSQL (RLS). */
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { SaveData } from '../core/types';
import { redirectUrl, type AccountConfig } from './config';
import { accountError, normalizeError } from './errors';
import type { AccountProfile, AuthBackend, AuthEvent, AuthUser, CloudSave, ProfessionalProfile, SignUpInput, SignUpResult } from './types';

const toUser = (u: User | null | undefined): AuthUser | null => (u ? { id: u.id, email: u.email ?? '', createdAt: u.created_at } : null);

export class SupabaseBackend implements AuthBackend {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;

  constructor(cfg: AccountConfig) {
    this.sb = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // os links de confirmação e de recuperação abrem a página do jogo com a sessão na URL
        detectSessionInUrl: true,
        storageKey: 'aurora-vet-auth',
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async call<T = any>(p: PromiseLike<{ data: any; error: any }>): Promise<T> {
    let res: { data: T; error: unknown };
    try { res = await p; } catch (e) { throw normalizeError(e); }
    if (res.error) throw normalizeError(res.error);
    return res.data;
  }

  private async uid(): Promise<string> {
    const u = await this.getUser();
    if (!u) throw accountError('not_authenticated');
    return u.id;
  }

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.sb.auth.getSession();
    return toUser(data.session?.user);
  }

  onAuthEvent(cb: (event: AuthEvent, user: AuthUser | null) => void): () => void {
    const { data } = this.sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
        // o callback do Supabase não deve aguardar outras chamadas do cliente: repassa no próximo ciclo
        setTimeout(() => cb(event, toUser(session?.user)), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }

  async signUp(i: SignUpInput, versions: { terms: string; privacy: string }): Promise<SignUpResult> {
    const data = await this.call(this.sb.auth.signUp({
      email: i.email.trim(),
      password: i.password,
      options: {
        emailRedirectTo: redirectUrl(),
        // lidos pela função handle_new_user no banco, que cria o perfil e registra os aceites
        data: {
          username: i.username.trim(),
          professional_profile: i.professionalProfile,
          terms_accepted: i.termsAccepted,
          terms_version: versions.terms,
          privacy_acknowledged: i.privacyAcknowledged,
          privacy_version: versions.privacy,
          adult_declared: i.adultDeclared,
          marketing_opt_in: i.marketingOptIn,
        },
      },
    }));
    // Com confirmação de e-mail ativa, o Supabase não informa erro para e-mail já cadastrado;
    // devolve um usuário sem identidades. Tratamos como duplicado (sem criar nada).
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw accountError('email_in_use', 'email');
    return { needsConfirmation: !data.session };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const data = await this.call(this.sb.auth.signInWithPassword({ email: email.trim(), password }));
    return toUser(data.user)!;
  }

  async signOut(): Promise<void> {
    // encerra a sessão neste aparelho; se o servidor estiver fora do ar, limpa a sessão local mesmo assim
    const { error } = await this.sb.auth.signOut({ scope: 'local' });
    if (error) console.warn('[Aurora Vet] signOut', error.message);
  }

  async resendConfirmation(email: string): Promise<void> {
    await this.call(this.sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectUrl() } }));
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.call(this.sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() }));
  }

  async updatePassword(newPassword: string): Promise<void> {
    await this.call(this.sb.auth.updateUser({ password: newPassword }));
  }

  async reauthenticate(password: string): Promise<void> {
    const u = await this.getUser();
    if (!u) throw accountError('not_authenticated');
    try {
      await this.signIn(u.email, password);
    } catch (e) {
      const err = normalizeError(e);
      if (err.code === 'invalid_credentials') throw accountError('invalid_credentials', 'password', 'Senha atual incorreta.');
      throw err;
    }
  }

  async usernameAvailable(username: string): Promise<boolean> {
    return Boolean(await this.call(this.sb.rpc('username_available', { p_username: username.trim() })));
  }

  async getProfile(): Promise<AccountProfile | null> {
    const id = await this.uid();
    return (await this.call(this.sb.from('profiles').select('*').eq('id', id).maybeSingle())) as AccountProfile | null;
  }

  async updateProfile(patch: { username?: string; professional_profile?: ProfessionalProfile }): Promise<AccountProfile> {
    const id = await this.uid();
    return (await this.call(this.sb.from('profiles').update(patch).eq('id', id).select('*').single())) as AccountProfile;
  }

  async acceptDocuments(termsVersion: string, privacyVersion: string): Promise<void> {
    await this.call(this.sb.rpc('accept_documents', { p_terms_version: termsVersion, p_privacy_version: privacyVersion }));
  }

  async acknowledgeEducationalNotice(version: string): Promise<void> {
    await this.call(this.sb.rpc('acknowledge_educational_notice', { p_version: version }));
  }

  async setMarketingConsent(optIn: boolean, version: string): Promise<void> {
    await this.call(this.sb.rpc('set_marketing_consent', { p_opt_in: optIn, p_version: version }));
  }

  async loadSave(): Promise<CloudSave | null> {
    const id = await this.uid();
    const row = await this.call(this.sb.from('game_saves').select('data, client_updated_at').eq('user_id', id).maybeSingle());
    return row ? { data: row.data as SaveData, clientUpdatedAt: Number(row.client_updated_at) } : null;
  }

  async storeSave(data: SaveData, clientUpdatedAt: number): Promise<void> {
    const id = await this.uid();
    await this.call(this.sb.from('game_saves').upsert({ user_id: id, data, save_version: data.version, client_updated_at: clientUpdatedAt }));
  }

  async deleteSave(): Promise<void> {
    const id = await this.uid();
    await this.call(this.sb.from('game_saves').delete().eq('user_id', id));
  }

  async exportData(): Promise<unknown> {
    return this.call(this.sb.rpc('export_my_data'));
  }

  async deleteAccount(): Promise<void> {
    await this.call(this.sb.rpc('delete_my_account'));
    await this.signOut();
  }
}
