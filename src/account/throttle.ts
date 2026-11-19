/**
 * Freio de tentativas de login neste aparelho (camada de experiência).
 * A proteção principal contra abuso é a do servidor (limites de taxa do Supabase Auth);
 * este freio evita que o próprio cliente dispare tentativas em sequência.
 *
 * Regra: até 5 erros em 15 minutos; a partir daí, espera de 30 s, que dobra a cada novo erro (máx. 15 min).
 */
import type { KeyValueStorage } from '../core/SaveManager';

const KEY = 'aurora.loginAttempts';
const WINDOW_MS = 15 * 60 * 1000;
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 15 * 60 * 1000;

interface State { failures: number[]; lockedUntil: number }

export class LoginThrottle {
  constructor(private storage: KeyValueStorage, private now: () => number = Date.now) {}

  private read(): State {
    try {
      const s = JSON.parse(this.storage.getItem(KEY) ?? '') as State;
      if (Array.isArray(s.failures) && typeof s.lockedUntil === 'number') return s;
    } catch { /* vazio ou corrompido */ }
    return { failures: [], lockedUntil: 0 };
  }

  private write(s: State): void {
    try { this.storage.setItem(KEY, JSON.stringify(s)); } catch { /* armazenamento indisponível */ }
  }

  /** milissegundos restantes de espera (0 = pode tentar) */
  remainingMs(): number {
    return Math.max(0, this.read().lockedUntil - this.now());
  }

  recordFailure(): number {
    const t = this.now();
    const s = this.read();
    s.failures = s.failures.filter((f) => t - f < WINDOW_MS);
    s.failures.push(t);
    const over = s.failures.length - FREE_ATTEMPTS;
    if (over >= 0) s.lockedUntil = t + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** over);
    this.write(s);
    return this.remainingMs();
  }

  recordSuccess(): void {
    this.write({ failures: [], lockedUntil: 0 });
  }
}

export function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s} segundo${s === 1 ? '' : 's'}`;
  const m = Math.ceil(s / 60);
  return `${m} minuto${m === 1 ? '' : 's'}`;
}
