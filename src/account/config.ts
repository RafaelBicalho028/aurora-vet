/**
 * Configuração do serviço de contas (Supabase). Os valores vêm de variáveis de build:
 *   VITE_SUPABASE_URL       — endereço do projeto (https://<id>.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  — chave PÚBLICA do projeto ("anon"/"publishable"). Ela é feita para ficar no
 *                             navegador: o acesso aos dados é controlado pelas regras RLS do banco.
 * NUNCA coloque aqui a chave "service_role"/"secret": ela ignora as regras de acesso.
 */
export interface AccountConfig {
  url: string;
  anonKey: string;
}

export function readAccountConfig(env: Record<string, unknown> = import.meta.env): AccountConfig | null {
  const url = String(env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anonKey) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) {
    console.error('[Aurora Vet] VITE_SUPABASE_URL inválida:', url);
    return null;
  }
  // chave secreta no cliente seria uma falha grave de segurança: recusa usar
  if (/^sb_secret_/.test(anonKey) || decodeRole(anonKey) === 'service_role') {
    console.error('[Aurora Vet] Uma chave secreta (service_role) foi configurada no cliente. Use a chave pública (anon).');
    return null;
  }
  return { url: url.replace(/\/$/, ''), anonKey };
}

function decodeRole(key: string): string | null {
  try {
    const payload = key.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role ?? null;
  } catch {
    return null;
  }
}

/** Endereço para onde os links de confirmação e de recuperação de senha levam (a própria página do jogo). */
export function redirectUrl(): string {
  return `${location.origin}${location.pathname}`;
}
