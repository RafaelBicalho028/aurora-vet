/** Validação dos formulários de conta (cliente). O servidor repete as regras essenciais. */
import type { ProfessionalProfile, SignUpInput } from './types';

export const USERNAME_RE = /^[A-Za-z0-9_.]{3,20}$/;
export const PASSWORD_MIN = 8;
/** limite do bcrypt usado pelo Supabase Auth */
export const PASSWORD_MAX = 72;

export type FieldErrors = Partial<Record<keyof SignUpInput | 'form', string>>;

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return 'Informe seu e-mail.';
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Digite um e-mail válido, como nome@exemplo.com.';
  return null;
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (!u) return 'Escolha um nome de usuário.';
  if (u.length < 3 || u.length > 20) return 'O nome de usuário deve ter de 3 a 20 caracteres.';
  if (!USERNAME_RE.test(u)) return 'Use apenas letras sem acento, números, ponto (.) ou sublinhado (_).';
  return null;
}

export interface PasswordCheck { id: 'length' | 'letter' | 'number'; label: string; ok: boolean }

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { id: 'length', label: `Pelo menos ${PASSWORD_MIN} caracteres`, ok: pw.length >= PASSWORD_MIN },
    { id: 'letter', label: 'Pelo menos uma letra', ok: /\p{L}/u.test(pw) },
    { id: 'number', label: 'Pelo menos um número', ok: /\d/.test(pw) },
  ];
}

export function validatePassword(pw: string): string | null {
  if (!pw) return 'Crie uma senha.';
  if (pw.length > PASSWORD_MAX) return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`;
  const failed = passwordChecks(pw).filter((c) => !c.ok);
  if (failed.length) return `Senha fraca: ${failed.map((c) => c.label.toLowerCase()).join(', ')}.`;
  return null;
}

export function validatePasswordConfirm(pw: string, confirm: string): string | null {
  if (!confirm) return 'Repita a senha.';
  return pw === confirm ? null : 'As senhas não são iguais.';
}

export function validateProfile(p: ProfessionalProfile | null): string | null {
  return p ? null : 'Selecione o seu perfil.';
}

export function validateSignUp(i: SignUpInput): FieldErrors {
  const e: FieldErrors = {};
  const set = (k: keyof FieldErrors, v: string | null) => { if (v) e[k] = v; };
  set('username', validateUsername(i.username));
  set('email', validateEmail(i.email));
  set('password', validatePassword(i.password));
  set('passwordConfirm', validatePasswordConfirm(i.password, i.passwordConfirm));
  set('professionalProfile', validateProfile(i.professionalProfile));
  if (!i.termsAccepted) e.termsAccepted = 'Para criar a conta, é preciso ler e concordar com os Termos de Uso.';
  if (!i.privacyAcknowledged) e.privacyAcknowledged = 'Confirme que leu a Política de Privacidade.';
  if (!i.adultDeclared) e.adultDeclared = 'Nesta versão, o cadastro é permitido apenas para maiores de 18 anos.';
  return e;
}

export function hasErrors(e: FieldErrors): boolean {
  return Object.keys(e).length > 0;
}
