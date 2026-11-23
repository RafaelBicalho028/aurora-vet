/**
 * Ponto único de acesso ao serviço de conta.
 * - Produção: Supabase (requer VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no build).
 * - Desenvolvimento (npm run dev) ou build de teste (VITE_DEV_AUTH=1) sem configuração, ou com ?devauth
 *   na URL: backend simulado. Esse ramo é removido do build de publicação.
 * - Produção sem configuração: o jogo mostra "serviço de contas indisponível" e não libera o acesso.
 */
import { app } from '../core/context';
import { AccountService } from './AccountService';
import { checkConnection, readAccountConfig, type ConnectionCheck } from './config';
import { SupabaseBackend } from './supabaseBackend';
import type { AuthBackend, AuthEvent } from './types';

/** fragmento da URL no momento em que a página abriu (links de confirmação/recuperação ou #termos, #privacidade) */
export const BOOT_HASH = typeof location !== 'undefined' ? location.hash : '';

let service: AccountService | null = null;
let ready: Promise<AccountService | null> | null = null;
const listeners = new Set<(e: AuthEvent) => void>();
let recoveryPending = /type=recovery/.test(BOOT_HASH);

export function initAccount(): Promise<AccountService | null> {
  if (ready) return ready;
  ready = (async () => {
    let backend: AuthBackend | null = null;
    const cfg = readAccountConfig();
    // contas simuladas: só em desenvolvimento ou em builds de teste (VITE_DEV_AUTH=1); nunca na publicação
    const devAllowed = import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH === '1';
    const forceDev = devAllowed && typeof location !== 'undefined' && new URLSearchParams(location.search).has('devauth');
    if (cfg && !forceDev) backend = new SupabaseBackend(cfg);
    else if (devAllowed) {
      const { DevBackend } = await import('./devBackend');
      backend = new DevBackend(app.saver.storage);
      (window as unknown as { __auroraDevAuth?: unknown }).__auroraDevAuth = backend;
    }
    if (!backend) return null;
    backend.onAuthEvent((e) => {
      if (e === 'PASSWORD_RECOVERY') recoveryPending = true;
      listeners.forEach((l) => l(e));
    });
    service = new AccountService(backend, app.saver, app.saver.storage);
    return service;
  })();
  return ready;
}

export function account(): AccountService | null { return service; }

export function onAccountEvent(cb: (e: AuthEvent) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function takeRecoveryPending(): boolean {
  const v = recoveryPending;
  recoveryPending = false;
  return v;
}

/** Erro devolvido no link de e-mail (ex.: link expirado), lido do fragmento da URL. */
export function bootLinkError(): string | null {
  if (!/error/.test(BOOT_HASH)) return null;
  const p = new URLSearchParams(BOOT_HASH.replace(/^#/, ''));
  const code = p.get('error_code') ?? p.get('error') ?? '';
  if (/expired/i.test(code + (p.get('error_description') ?? ''))) return 'Este link expirou ou já foi usado. Peça um novo link (reenvio da confirmação ou “Esqueci minha senha”).';
  return 'Não foi possível validar o link recebido por e-mail. Peça um novo link e tente novamente.';
}

/** Testa a conexão com o servidor de contas (usado na mensagem de falha de rede). */
export async function testAccountConnection(): Promise<ConnectionCheck | null> {
  const cfg = readAccountConfig();
  return cfg ? checkConnection(cfg) : null;
}
