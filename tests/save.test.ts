/** Testes de salvamento e carregamento (LocalStorage abstraído). */
import { describe, expect, it } from 'vitest';
import { MemoryStorage, SaveManager, SAVE_KEY, SETTINGS_KEY, isValidSave, migrate, defaultSettings, exportSaveCode as exportSaveCodeSync } from '../src/core/SaveManager';
import { GameState, newSaveData } from '../src/core/GameState';
import type { Appearance } from '../src/core/types';

const look: Appearance = { skin: 2, hairColor: 0, hairStyle: 'cacheado', uniform: 'pijama', uniformColor: 3, glasses: true };

describe('SaveManager', () => {
  it('salva e carrega o mesmo estado (ida e volta)', () => {
    const storage = new MemoryStorage();
    const sm = new SaveManager(storage);
    expect(sm.hasSave()).toBe(false);
    const data = newSaveData('Ana', look, 1000);
    data.totalXp = 345;
    data.flags['x'] = true;
    data.vetidex.unlocked.push('especie_cao');
    data.player.mapId = 'hospital';
    data.player.x = 5;
    expect(sm.save(data)).toBe(true);
    const loaded = sm.load()!;
    expect(loaded.player.name).toBe('Ana');
    expect(loaded.player.appearance).toEqual(look);
    expect(loaded.player.mapId).toBe('hospital');
    expect(loaded.totalXp).toBe(345);
    expect(loaded.vetidex.unlocked).toEqual(['especie_cao']);
    expect(loaded.updatedAt).toBeGreaterThanOrEqual(1000);
    expect(sm.hasSave()).toBe(true);
  });

  it('ignora JSON corrompido e estruturas inválidas sem lançar erro', () => {
    const storage = new MemoryStorage();
    const sm = new SaveManager(storage);
    storage.setItem(SAVE_KEY, '{nao-e-json');
    expect(sm.load()).toBeNull();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: { name: 'x' } }));
    expect(sm.load()).toBeNull();
  });

  it('não carrega saves de versão futura', () => {
    const storage = new MemoryStorage();
    const sm = new SaveManager(storage);
    const d = newSaveData('Ana', look);
    storage.setItem(SAVE_KEY, JSON.stringify({ ...d, version: 99 }));
    expect(sm.load()).toBeNull();
  });

  it('migra saves antigos preenchendo campos ausentes', () => {
    const d: any = newSaveData('Ana', look);
    delete d.reviewItems;
    delete d.stats;
    delete d.vetidex.seen;
    delete d.disciplines;
    expect(isValidSave(d)).toBe(true);
    const m = migrate(d);
    expect(m.reviewItems).toEqual([]);
    expect(m.stats.casesCompleted).toBe(0);
    expect(m.vetidex.seen).toEqual([]);
    expect(m.disciplines).toEqual({});
  });

  it('apagar progresso remove o save', () => {
    const sm = new SaveManager(new MemoryStorage());
    sm.save(newSaveData('Ana', look));
    sm.clear();
    expect(sm.load()).toBeNull();
  });

  it('configurações: padrão, mescla com teclas novas e persistência', () => {
    const storage = new MemoryStorage();
    const sm = new SaveManager(storage);
    expect(sm.loadSettings()).toEqual(defaultSettings());
    storage.setItem(SETTINGS_KEY, JSON.stringify({ musicVolume: 0.1, keybinds: { interact: ['KeyF'] } }));
    const s = sm.loadSettings();
    expect(s.musicVolume).toBe(0.1);
    expect(s.keybinds.interact).toEqual(['KeyF']);
    expect(s.keybinds.up).toEqual(['KeyW', 'ArrowUp']);
    s.sfxVolume = 0.3;
    sm.saveSettings(s);
    expect(sm.loadSettings().sfxVolume).toBe(0.3);
  });

  it('GameState salva automaticamente ao concluir objetivos', () => {
    const storage = new MemoryStorage();
    const sm = new SaveManager(storage);
    const st = new GameState(newSaveData('Ana', look), sm);
    st.startQuest('q_boas_vindas');
    st.completeObjective('q_boas_vindas', 'o_lucas');
    const loaded = sm.load()!;
    expect(loaded.quests['q_boas_vindas'].objectives['o_lucas']).toBe(true);
  });
});

describe('Código de salvamento (backup)', () => {
  it('exporta e importa o progresso completo, com acentos e emojis', async () => {
    const { exportSaveCode, importSaveCode } = await import('../src/core/SaveManager');
    const d = newSaveData('Conceição 🐾', look);
    d.totalXp = 777;
    d.pets.owned.push({ id: 'p1', species: 'cao', breed: 'cao_pug', name: 'Pão de Queijo', adoptedAt: 1, affection: 3 });
    const code = exportSaveCode(d);
    expect(code.startsWith('VQ1-')).toBe(true);
    const r = importSaveCode(`  ${code.slice(0, 40)}\n${code.slice(40)}  `); // tolera quebras de linha e espaços
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.player.name).toBe('Conceição 🐾');
      expect(r.data.totalXp).toBe(777);
      expect(r.data.pets.owned[0].name).toBe('Pão de Queijo');
    }
  });
  it('rejeita textos aleatórios, códigos cortados ou adulterados', async () => {
    const { exportSaveCode, importSaveCode } = await import('../src/core/SaveManager');
    const code = exportSaveCode(newSaveData('Ana', look));
    expect(importSaveCode('olá').ok).toBe(false);
    expect(importSaveCode(code.slice(0, code.length - 10)).ok).toBe(false);
    const tampered = code.slice(0, -6) + (code.slice(-6, -5) === 'A' ? 'B' : 'A') + code.slice(-5);
    expect(importSaveCode(tampered).ok).toBe(false);
  });
  it('restaurar grava no armazenamento e passa a ser o save carregado', () => {
    const sm = new SaveManager(new MemoryStorage());
    sm.save(newSaveData('Antigo', look));
    const other = newSaveData('Novo', look);
    other.totalXp = 50;
    const r = sm.importCode(exportSaveCodeSync(other));
    expect(r.ok).toBe(true);
    expect(sm.load()!.player.name).toBe('Novo');
  });
});
