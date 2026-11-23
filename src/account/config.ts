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

export type ConnectionCheck = { ok: boolean; summary: string };

/**
 * Teste de conexão com o Supabase, para o jogador (ou o suporte) entender uma falha de rede.
 * Chama o endpoint público de saúde do Auth com a chave pública.
 */
export async function checkConnection(cfg: AccountConfig, fetchFn: typeof fetch = fetch): Promise<ConnectionCheck> {
  const host = new URL(cfg.url).host;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 12000);
  try {
    const r = await fetchFn(`${cfg.url}/auth/v1/health`, { headers: { apikey: cfg.anonKey }, signal: ctrl?.signal });
    if (r.ok) return { ok: true, summary: `Servidor ${host} respondeu normalmente (HTTP ${r.status}).` };
    if (r.status === 401) return { ok: false, summary: `Servidor ${host} respondeu, mas recusou a chave pública (HTTP 401). Confira a variável SUPABASE_ANON_KEY.` };
    if (r.status === 540 || r.status === 503) return { ok: false, summary: `Servidor ${host} respondeu HTTP ${r.status}: o projeto Supabase pode estar pausado ou indisponível.` };
    return { ok: false, summary: `Servidor ${host} respondeu HTTP ${r.status}.` };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      summary: err.name === 'AbortError'
        ? `Sem resposta de ${host} em 12 segundos.`
        : `Não foi possível alcançar ${host} (${err.name}: ${err.message}). Possíveis causas: rede ou extensão do navegador bloqueando o endereço, projeto pausado ou endereço incorreto.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
