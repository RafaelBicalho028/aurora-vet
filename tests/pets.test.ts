/** Pets: integridade das fichas e regras de adoção/companhia. */
import { describe, expect, it } from 'vitest';
import { BREEDS, BREED_MAP, MAX_PETS, PET_SPECIES } from '../src/content/pets';
import { REFERENCE_MAP } from '../src/content';
import { petFrameRows, PET_FRAMES, PET_H, PET_W } from '../src/art/pets';
import { GameState, newSaveData } from '../src/core/GameState';
import { MemoryStorage, SaveManager } from '../src/core/SaveManager';

const mk = () => new GameState(newSaveData('Ana', { skin: 0, hairColor: 0, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false }), new SaveManager(new MemoryStorage()));

describe('Fichas dos pets', () => {
  it('há várias raças de cães e gatos e outros animais', () => {
    expect(BREEDS.filter((b) => b.species === 'cao').length).toBeGreaterThanOrEqual(10);
    expect(BREEDS.filter((b) => b.species === 'gato').length).toBeGreaterThanOrEqual(6);
    expect(BREEDS.filter((b) => b.species === 'outros').length).toBeGreaterThanOrEqual(4);
  });
  it('ids únicos, espécie válida, ficha completa e referências existentes', () => {
    const species = new Set(PET_SPECIES.map((s) => s.id));
    expect(new Set(BREEDS.map((b) => b.id)).size).toBe(BREEDS.length);
    for (const b of BREEDS) {
      expect(species.has(b.species), b.id).toBe(true);
      expect(b.fact.length, b.id).toBeGreaterThan(30);
      expect(b.care.length, b.id).toBeGreaterThan(20);
      expect(b.refs.length, b.id).toBeGreaterThan(0);
      for (const r of b.refs) expect(REFERENCE_MAP[r], `${b.id}: ${r}`).toBeDefined();
    }
  });
  it('todo sprite gera 4 quadros 24x18 dentro da área e com olhos visíveis', () => {
    for (const b of BREEDS) {
      for (let f = 0; f < PET_FRAMES; f++) {
        const rows = petFrameRows(b.look, f);
        expect(rows.length).toBe(PET_H);
        rows.forEach((r) => expect(r.length).toBe(PET_W));
        expect(rows.join('').replace(/\./g, '').length, `${b.id} quadro ${f}`).toBeGreaterThan(20);
        // margem de 1px para o contorno automático
        expect(rows[PET_H - 1].replace(/\./g, ''), `${b.id}: encostou na borda inferior`).toBe('');
      }
      expect(petFrameRows(b.look, 0).join('').includes('E'), `${b.id}: sem olho`).toBe(true);
    }
  });
});

describe('Adoção e companhia', () => {
  it('adotar define o primeiro pet como companheiro e respeita o limite', () => {
    const st = mk();
    const a = st.adoptPet('cao_srd', '  Mel  ', 1);
    expect(a?.name).toBe('Mel');
    expect(st.data.pets.companion).toBe(a!.id);
    for (let i = 0; i < MAX_PETS + 2; i++) st.adoptPet('gato_siames', `Gato${i}`, 10 + i);
    expect(st.data.pets.owned.length).toBe(MAX_PETS);
    expect(st.adoptPet('coelho', 'Extra', 99)).toBeNull();
    expect(st.data.pets.companion).toBe(a!.id);
  });
  it('rejeita raça inexistente ou nome vazio', () => {
    const st = mk();
    expect(st.adoptPet('dragao', 'X')).toBeNull();
    expect(st.adoptPet('cao_pug', '   ')).toBeNull();
  });
  it('trocar companheiro, deixar em casa e afeição limitada a 10', () => {
    const st = mk();
    const a = st.adoptPet('cao_pug', 'Bolota', 1)!;
    const b = st.adoptPet('hamster', 'Grão', 2)!;
    st.setCompanion(b.id);
    expect(st.companion()?.id).toBe(b.id);
    st.setCompanion('inexistente');
    expect(st.companion()?.id).toBe(b.id);
    st.setCompanion(null);
    expect(st.companion()).toBeNull();
    for (let i = 0; i < 15; i++) st.petAffection(a.id);
    expect(st.data.pets.owned[0].affection).toBe(10);
    expect(BREED_MAP[a.breed].name).toBe('Pug');
  });
  it('saves antigos sem pets são migrados', async () => {
    const { migrate } = await import('../src/core/SaveManager');
    const d: any = newSaveData('Ana', { skin: 0, hairColor: 0, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false });
    delete d.pets;
    delete d.questionStats;
    const m = migrate(d);
    expect(m.pets).toEqual({ owned: [], companion: null });
    expect(m.questionStats).toEqual({});
  });
});

describe('Saúde do pet (consulta preventiva)', async () => {
  const { careItemsFor, careStatus, distractorsFor, dueItems, scoreCheckup } = await import('../src/systems/pets/health');
  const { CARE_ITEMS, CARE_DISTRACTORS, PET_MONTH_MS } = await import('../src/content/petHealth');
  const T0 = 1_000_000_000;

  it('toda espécie de pet tem cuidados e pelo menos uma alternativa incorreta', () => {
    for (const kind of ['dog', 'cat', 'rabbit', 'guineapig', 'hamster', 'cockatiel'] as const) {
      expect(careItemsFor(kind).length, kind).toBeGreaterThanOrEqual(3);
      expect(distractorsFor(kind).length, kind).toBeGreaterThanOrEqual(1);
    }
    for (const x of [...CARE_ITEMS, ...CARE_DISTRACTORS]) {
      expect(x.why.length, x.id).toBeGreaterThan(20);
      for (const r of x.refs) expect(REFERENCE_MAP[r], `${x.id}: ${r}`).toBeDefined();
    }
  });

  it('pendências: nunca feito, vencido, vence logo e em dia', () => {
    const vac = CARE_ITEMS.find((i) => i.id === 'vacinas_cao')!;
    expect(careStatus(vac, {}, T0).status).toBe('pendente');
    expect(careStatus(vac, { vacinas_cao: T0 }, T0 + 2 * PET_MONTH_MS).status).toBe('em_dia');
    expect(careStatus(vac, { vacinas_cao: T0 }, T0 + 11.5 * PET_MONTH_MS).status).toBe('vence_logo');
    expect(careStatus(vac, { vacinas_cao: T0 }, T0 + 12 * PET_MONTH_MS).status).toBe('pendente');
    const cast = CARE_ITEMS.find((i) => i.id === 'castracao')!;
    expect(careStatus(cast, { castracao: T0 }, T0 + 1000 * PET_MONTH_MS).status).toBe('em_dia');
  });

  it('pontuação: tudo certo = 100; esquecer cuidados reduz; escolha perigosa zera', () => {
    const all = dueItems('cat', {}, T0).map((i) => i.id);
    expect(scoreCheckup('cat', {}, all, true, T0).score).toBe(100);
    expect(scoreCheckup('cat', {}, all.slice(0, Math.ceil(all.length / 2)), true, T0).score).toBeLessThan(80);
    expect(scoreCheckup('cat', {}, [...all, 'x_areia'], true, T0).score).toBe(85);
    const crit = scoreCheckup('cat', {}, [...all, 'x_permetrina'], true, T0);
    expect(crit.score).toBe(0);
    expect(crit.passed).toBe(false);
  });

  it('a consulta registra os cuidados, dá XP só com pendências e não registra nada após escolha crítica', () => {
    const st = mk();
    const pet = st.adoptPet('gato_persa', 'Nuvem', T0)!;
    const due = st.petDue(pet.id, T0).map((i) => i.id);
    const bad = st.completeCheckup(pet.id, [...due, 'x_permetrina'], true, T0);
    expect(bad.xp).toBe(0);
    expect(st.petDue(pet.id, T0).length).toBe(due.length);
    const ok = st.completeCheckup(pet.id, due, true, T0);
    expect(ok.xp).toBeGreaterThan(0);
    expect(st.petDue(pet.id, T0 + PET_MONTH_MS / 2)).toEqual([]);
    // um mês do pet depois, o controle de pulgas volta a ficar pendente
    expect(st.petDue(pet.id, T0 + PET_MONTH_MS).map((i) => i.id)).toContain('ectoparasitas');
    expect(st.completeCheckup(pet.id, due, true, T0 + 10).xp).toBe(0);
  });
});
