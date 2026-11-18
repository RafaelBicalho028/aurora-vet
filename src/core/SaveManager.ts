/**
 * Salvamento local (LocalStorage) com versionamento, validação e migração.
 * A dependência de armazenamento é injetável para permitir testes automatizados.
 */
import type { SaveData, Settings } from './types';

export const SAVE_KEY = 'vetquest.save.v1';
export const SETTINGS_KEY = 'vetquest.settings.v1';
export const SAVE_VERSION = 1;

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
  d.version = SAVE_VERSION;
  return d as SaveData;
}

export class SaveManager {
  constructor(private storage: KeyValueStorage = defaultStorage()) {}

  hasSave(): boolean {
    return this.load() !== null;
  }

  save(data: SaveData): boolean {
    try {
      const toSave: SaveData = { ...data, updatedAt: Date.now(), version: SAVE_VERSION };
      this.storage.setItem(SAVE_KEY, JSON.stringify(toSave));
      return true;
    } catch (e) {
      console.error('[SaveManager] falha ao salvar', e);
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
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
    this.storage.removeItem(SAVE_KEY);
  }

  exportString(): string | null {
    return this.storage.getItem(SAVE_KEY);
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
