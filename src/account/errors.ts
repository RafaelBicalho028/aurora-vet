/** Converte erros do provedor de autenticação em mensagens claras, sem expor detalhes internos. */
import { AccountError, type AccountErrorCode } from './types';

const MESSAGES: Record<AccountErrorCode, string> = {
  email_in_use: 'Já existe uma conta com este e-mail. Use “Entrar” ou “Esqueci minha senha”.',
  username_in_use: 'Este nome de usuário já está em uso. Escolha outro.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar: abra o link que enviamos para a sua caixa de entrada (veja também o spam).',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.',
  rate_limited: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  locked: 'Muitas tentativas seguidas. Aguarde para tentar de novo.',
  network: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
  not_authenticated: 'Sua sessão expirou. Entre novamente.',
  reauth_required: 'Por segurança, confirme sua senha para continuar.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  signup_rejected: 'Não foi possível concluir o cadastro. Confira os campos e tente novamente.',
  invalid_input: 'Confira os dados informados.',
  not_configured: 'O serviço de contas ainda não foi configurado neste site.',
  unknown: 'Algo deu errado. Tente novamente em instantes.',
};

export function accountError(code: AccountErrorCode, field?: string, message?: string): AccountError {
  return new AccountError(code, message ?? MESSAGES[code], field);
}

export function messageFor(code: AccountErrorCode): string {
  return MESSAGES[code];
}

/** Erro do Supabase (AuthError / PostgrestError / falha de rede) → AccountError */
export function normalizeError(err: unknown): AccountError {
  if (err instanceof AccountError) return err;
  const e = (err ?? {}) as { code?: string; status?: number; message?: string; name?: string };
  const code = String(e.code ?? '');
  const msg = String(e.message ?? '');
  if (e.name === 'AuthRetryableFetchError' || /Failed to fetch|NetworkError|Load failed/i.test(msg)) return accountError('network');
  if (code === 'user_already_exists' || code === 'email_exists') return accountError('email_in_use', 'email');
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return accountError('invalid_credentials');
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return accountError('email_not_confirmed');
  if (code === 'weak_password') return accountError('weak_password', 'password');
  if (code === 'same_password') return accountError('same_password', 'password');
  if (code === 'reauthentication_needed' || /reautenticacao_necessaria/.test(msg)) return accountError('reauth_required');
  if (code.startsWith('over_') || e.status === 429) return accountError('rate_limited');
  if (/profiles_username_unique/.test(msg) || code === '23505') return accountError('username_in_use', 'username');
  if (/cadastro_invalido|Database error saving new user/i.test(msg) || code === 'unexpected_failure') return accountError('signup_rejected');
  if (/nao_autenticado|JWT|session_not_found|refresh_token/i.test(msg + code)) return accountError('not_authenticated');
  return accountError('unknown');
}
