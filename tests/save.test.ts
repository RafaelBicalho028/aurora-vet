/** Testes de salvamento e carregamento (LocalStorage abstraído). */
import { describe, expect, it } from 'vitest';
import { MemoryStorage, SaveManager, SAVE_KEY, SETTINGS_KEY, isValidSave, migrate, defaultSettings } from '../src/core/SaveManager';
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
