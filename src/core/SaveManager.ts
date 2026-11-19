import { newCalendar } from '../systems/days/calendar';
/**
 * Salvamento local (LocalStorage) com versionamento, validação e migração.
 * A dependência de armazenamento é injetável para permitir testes automatizados.
 */
import type { SaveData, Settings } from './types';

export const SAVE_KEY = 'vetquest.save.v1';
export const SETTINGS_KEY = 'vetquest.settings.v1';
export const SAVE_VERSION = 1;
/** progresso de cada conta neste aparelho (cópia local da nuvem): aurora.save.u.<id da conta> */
export const ACCOUNT_SAVE_PREFIX = 'aurora.save.u.';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Armazenamento em memória (fallback quando LocalStorage não está disponível, e para testes). */
export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

function defaultStorage(): KeyValueStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const t = '__vq_test__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return window.localStorage;
    }
  } catch {
    /* navegação privada ou armazenamento bloqueado */
  }
  return new MemoryStorage();
}

export const DEFAULT_KEYBINDS: Record<string, string[]> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE', 'Enter', 'Space'],
  menu: ['Escape'],
  inventory: ['KeyI'],
  map: ['KeyM'],
  vetidex: ['KeyV'],
  journal: ['KeyJ'],
  performance: ['KeyP'],
  run: ['ShiftLeft', 'ShiftRight'],
};

export function defaultSettings(): Settings {
  return {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    textSpeed: 'normal',
    keybinds: JSON.parse(JSON.stringify(DEFAULT_KEYBINDS)),
    showTouchControls: 'auto',
    textSize: 'normal',
  };
}

/** Verificação estrutural mínima de um save carregado. */
export function isValidSave(d: unknown): d is SaveData {
  if (!d || typeof d !== 'object') return false;
  const s = d as Partial<SaveData>;
  return (
    typeof s.version === 'number' &&
    !!s.player &&
    typeof s.player.name === 'string' &&
    typeof s.player.mapId === 'string' &&
    typeof s.player.x === 'number' &&
    typeof s.player.y === 'number' &&
    typeof s.totalXp === 'number' &&
    !!s.quests && typeof s.quests === 'object' &&
    !!s.vetidex && Array.isArray(s.vetidex.unlocked) &&
    Array.isArray(s.caseHistory)
  );
}

/** Migrações entre versões do formato de save. */
export function migrate(raw: any): SaveData {
  const d = { ...raw };
  if (!d.inventory) d.inventory = {};
  if (!d.flags) d.flags = {};
  if (!d.disciplines) d.disciplines = {};
  if (!d.reviewItems) d.reviewItems = [];
  if (!d.questionStats) d.questionStats = {};
  if (!d.pets) d.pets = { owned: [], companion: null };
  if (!d.stats) d.stats = { playTimeSec: 0, steps: 0, casesCompleted: 0 };
  if (!d.vetidex.seen) d.vetidex.seen = [];
  if (!d.calendar) d.calendar = newCalendar();
  d.version = SAVE_VERSION;
  return d as SaveData;
}

// ------------------------------------------------------------ código de salvamento (backup)
const CODE_PREFIX = 'VQ1-';

function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).padStart(7, '0');
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Gera um código de texto com todo o progresso (para copiar e guardar ou levar a outro aparelho). */
export function exportSaveCode(data: SaveData): string {
  const json = JSON.stringify(data);
  return `${CODE_PREFIX}${fnv(json)}-${toBase64(json)}`;
}

export type ImportResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** Lê um código de salvamento, verificando integridade, estrutura e versão. */
export function importSaveCode(code: string): ImportResult {
  const clean = code.replace(/\s+/g, '');
  if (!clean.startsWith(CODE_PREFIX)) return { ok: false, error: 'Este texto não é um código de salvamento do Aurora Vet.' };
  const rest = clean.slice(CODE_PREFIX.length);
  const dash = rest.indexOf('-');
  if (dash < 0) return { ok: false, error: 'Código incompleto. Copie o código inteiro, do início ao fim.' };
  const sum = rest.slice(0, dash);
  let json: string;
  try { json = fromBase64(rest.slice(dash + 1)); } catch { return { ok: false, error: 'Código corrompido ou incompleto. Copie o código inteiro novamente.' }; }
  if (fnv(json) !== sum) return { ok: false, error: 'O código foi alterado ou cortado (falha na verificação). Copie o código inteiro novamente.' };
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { ok: false, error: 'Código corrompido.' }; }
  if (!isValidSave(parsed)) return { ok: false, error: 'O código não contém um progresso válido.' };
  if (parsed.version > SAVE_VERSION) return { ok: false, error: 'Este código foi gerado por uma versão mais nova do jogo.' };
  return { ok: true, data: migrate(parsed) };
}

export class SaveManager {
  /** sem conta: chave antiga (saves anteriores ao sistema de contas e testes) */
  private key = SAVE_KEY;
  /** chamado após cada gravação local — usado para sincronizar com a conta */
  onPersist: ((data: SaveData) => void) | null = null;
  /** chamado quando o progresso é apagado — usado para apagar também na conta */
  onClear: (() => void) | null = null;

  constructor(readonly storage: KeyValueStorage = defaultStorage()) {}

  /** Passa a ler e gravar o progresso da conta indicada (null = chave antiga, sem conta). */
  setAccount(userId: string | null): void {
    this.key = userId ? ACCOUNT_SAVE_PREFIX + userId : SAVE_KEY;
  }

  get currentKey(): string { return this.key; }

  hasSave(): boolean {
    return this.load() !== null;
  }

  save(data: SaveData): boolean {
    try {
      const toSave: SaveData = { ...data, updatedAt: Date.now(), version: SAVE_VERSION };
      this.storage.setItem(this.key, JSON.stringify(toSave));
      this.onPersist?.(toSave);
      return true;
    } catch (e) {
      console.error('[SaveManager] falha ao salvar', e);
      return false;
    }
  }

  /** Grava exatamente o conteúdo recebido (sem mudar a data nem disparar sincronização). */
  saveExact(data: SaveData): boolean {
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[SaveManager] falha ao salvar', e);
      return false;
    }
  }

  load(): SaveData | null {
    return this.parse(this.storage.getItem(this.key));
  }

  /** Progresso salvo neste navegador antes do sistema de contas (nunca é apagado automaticamente). */
  loadLegacy(): SaveData | null {
    return this.parse(this.storage.getItem(SAVE_KEY));
  }

  private parse(raw: string | null): SaveData | null {
    try {
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isValidSave(parsed)) {
        console.warn('[SaveManager] save inválido ignorado');
        return null;
      }
      if (parsed.version > SAVE_VERSION) {
        console.warn('[SaveManager] save de versão mais nova que o jogo');
        return null;
      }
      return migrate(parsed);
    } catch (e) {
      console.warn('[SaveManager] save corrompido', e);
      return null;
    }
  }

  clear(): void {
    this.storage.removeItem(this.key);
    this.onClear?.();
  }

  exportString(): string | null {
    return this.storage.getItem(this.key);
  }

  /** Substitui o progresso salvo pelo conteúdo de um código de salvamento. */
  importCode(code: string): ImportResult {
    const r = importSaveCode(code);
    if (r.ok && !this.save(r.data)) return { ok: false, error: 'Não foi possível gravar neste navegador (armazenamento bloqueado ou cheio).' };
    return r;
  }

  loadSettings(): Settings {
    try {
      const raw = this.storage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      const parsed = JSON.parse(raw);
      const def = defaultSettings();
      return { ...def, ...parsed, keybinds: { ...def.keybinds, ...(parsed.keybinds ?? {}) } };
    } catch {
      return defaultSettings();
    }
  }

  saveSettings(s: Settings): void {
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignora */
    }
  }
}
