/**
 * Tipos do sistema de contas. O jogo depende só desta interface (AuthBackend);
 * a implementação real usa o Supabase Auth + banco com RLS (supabaseBackend.ts).
 */
import type { SaveData } from '../core/types';

export type ProfessionalProfile = 'estudante' | 'veterinario' | 'explorador';

export const PROFESSIONAL_PROFILES: { id: ProfessionalProfile; icon: string; title: string; description: string }[] = [
  { id: 'estudante', icon: '🎓', title: 'Estudante de Medicina Veterinária', description: 'Pessoas que estão cursando Medicina Veterinária.' },
  { id: 'veterinario', icon: '🩺', title: 'Médico(a)-veterinário(a) formado(a)', description: 'Pessoas que já concluíram a graduação em Medicina Veterinária.' },
  { id: 'explorador', icon: '🧭', title: 'Explorador(a)', description: 'Pessoas sem formação veterinária que desejam conhecer o universo da Medicina Veterinária pelo jogo.' },
];

export const PROFILE_LABEL: Record<ProfessionalProfile, string> = {
  estudante: 'Estudante de Medicina Veterinária',
  veterinario: 'Médico(a)-veterinário(a) formado(a)',
  explorador: 'Explorador(a)',
};

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AccountProfile {
  id: string;
  username: string;
  professional_profile: ProfessionalProfile;
  marketing_opt_in: boolean;
  terms_version: string;
  privacy_version: string;
  educational_notice_version: string | null;
  educational_notice_ack_at: string | null;
  created_at: string;
}

export interface SignUpInput {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  professionalProfile: ProfessionalProfile | null;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  adultDeclared: boolean;
  marketingOptIn: boolean;
}

export interface SignUpResult {
  /** a conta precisa ser confirmada pelo link enviado por e-mail antes do primeiro login */
  needsConfirmation: boolean;
}

export interface CloudSave {
  data: SaveData;
  clientUpdatedAt: number;
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'USER_UPDATED';

/** Erro com código estável e mensagem pronta para o jogador (em português). */
export class AccountError extends Error {
  /** detalhe técnico (ex.: mensagem do navegador numa falha de rede), mostrado só em "detalhes" */
  detail?: string;
  constructor(public code: AccountErrorCode, message: string, public field?: string) {
    super(message);
    this.name = 'AccountError';
  }
}

export type AccountErrorCode =
  | 'email_in_use' | 'username_in_use' | 'invalid_credentials' | 'email_not_confirmed' | 'weak_password'
  | 'rate_limited' | 'locked' | 'network' | 'not_authenticated' | 'reauth_required' | 'same_password'
  | 'signup_rejected' | 'invalid_input' | 'not_configured' | 'unknown';

export interface AuthBackend {
  readonly kind: 'supabase' | 'dev';
  getUser(): Promise<AuthUser | null>;
  onAuthEvent(cb: (event: AuthEvent, user: AuthUser | null) => void): () => void;
  signUp(input: SignUpInput, versions: { terms: string; privacy: string }): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  /** define a nova senha (sessão de recuperação ou sessão recém-reautenticada) */
  updatePassword(newPassword: string): Promise<void>;
  /** confirma a senha atual, renovando a sessão (exigido para ações sensíveis) */
  reauthenticate(password: string): Promise<void>;
  usernameAvailable(username: string): Promise<boolean>;
  getProfile(): Promise<AccountProfile | null>;
  updateProfile(patch: { username?: string; professional_profile?: ProfessionalProfile }): Promise<AccountProfile>;
  acceptDocuments(termsVersion: string, privacyVersion: string): Promise<void>;
  acknowledgeEducationalNotice(version: string): Promise<void>;
  setMarketingConsent(optIn: boolean, version: string): Promise<void>;
  loadSave(): Promise<CloudSave | null>;
  storeSave(data: SaveData, clientUpdatedAt: number): Promise<void>;
  deleteSave(): Promise<void>;
  exportData(): Promise<unknown>;
  deleteAccount(): Promise<void>;
}
