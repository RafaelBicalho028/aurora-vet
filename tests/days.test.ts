/** Sistema de dias, pacientes do dia, alta dos pacientes e relatório exportável. */
import { describe, expect, it } from 'vitest';
import { GameState, newSaveData } from '../src/core/GameState';
import { MemoryStorage, SaveManager, migrate } from '../src/core/SaveManager';
import { CASES } from '../src/content';
import { DISCIPLINES } from '../src/content/disciplines';
import { QUESTS } from '../src/content/quests';
import { advancePeriod, dailyCase, generateArrivals, newCalendar, nextDay, SLOTS, type DailyPatient } from '../src/systems/days/calendar';
import { buildReport, reportToCsv, reportToText } from '../src/systems/report/report';
import { scoreCase } from '../src/systems/cases/scoring';
import { validateCase } from '../src/systems/cases/validateCase';
import { REFERENCE_MAP, VETIDEX } from '../src/content';
import { idealDecisions } from './helpers';

const mk = () => new GameState(newSaveData('Ana', { skin: 0, hairColor: 0, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false }), new SaveManager(new MemoryStorage()));
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
const thor = CASES['caso_thor_prurido'];
const bidu = CASES['caso_bidu_erliquiose'];

function pass(st: GameState, id: string) {
  const c = CASES[id];
  st.recordClinicalCase(c, scoreCase(c, idealDecisions(c)));
}

describe('Calendário', () => {
  it('começa no dia 1 de manhã; atendimentos avançam o período até a noite', () => {
    let c = newCalendar();
    expect([c.day, c.period]).toEqual([1, 0]);
    c = advancePeriod(advancePeriod(advancePeriod(c)));
    expect([c.day, c.period]).toEqual([1, 2]); // fica na noite até dormir
  });

  it('dormir leva ao dia seguinte de manhã, dá alta aos atendidos e traz novos pacientes', () => {
    const c0 = { ...newCalendar(), period: 2 as const };
    const { cal } = generateArrivals(c0, { pool: [thor], storyStage: 1, passedStoryCases: [] }, seq([0.9]));
    expect(cal.patients.length).toBe(1);
    cal.patients[0].status = 'treated';
    const { cal: c2, report } = nextDay(cal, { pool: [thor], storyStage: 1, passedStoryCases: ['caso_thor_prurido'] }, seq([0.1]));
    expect([c2.day, c2.period]).toEqual([2, 0]);
    expect(report.discharged.map((d) => d.where)).toEqual(['hospital', 'story']);
    expect(c2.storyDischarged).toContain('caso_thor_prurido');
    expect(report.arrived.length).toBe(2);
    expect(c2.patients.every((p) => p.status === 'waiting')).toBe(true);
  });

  it('respeita as vagas da sala de espera e só usa a Vila na Etapa 2', () => {
    let cal = newCalendar();
    for (let i = 0; i < 6; i++) cal = generateArrivals(cal, { pool: [thor, bidu], storyStage: 1, passedStoryCases: [] }, seq([0.1])).cal;
    expect(cal.patients.filter((p) => p.location === 'hospital').length).toBe(SLOTS.hospital);
    expect(cal.patients.some((p) => p.location === 'clinica_vila')).toBe(false);
    cal = generateArrivals(cal, { pool: [thor, bidu], storyStage: 2, passedStoryCases: [] }, seq([0.1])).cal;
    expect(cal.patients.filter((p) => p.location === 'clinica_vila').length).toBe(SLOTS.clinica_vila);
    const slots = cal.patients.map((p) => `${p.location}:${p.slot}`);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it('sem casos resolvidos não chegam pacientes extras', () => {
    const { arrived } = generateArrivals(newCalendar(), { pool: [], storyStage: 1, passedStoryCases: [] }, Math.random);
    expect(arrived).toEqual([]);
  });
});

describe('Pacientes do dia', () => {
  const p: DailyPatient = { uid: 'd2_1', caseId: thor.id, location: 'hospital', slot: 0, name: 'Bob', tutorName: 'Sr. Carlos', tutorFem: false, seed: 1, arrivedDay: 2, status: 'waiting' };
  it('troca nomes do animal e do tutor em todos os textos, mantendo ids e a solução', () => {
    const c = dailyCase(thor, p, 'dtutor_d2_1');
    const json = JSON.stringify(c);
    expect(json).not.toMatch(/Thor|Joaquim/);
    expect(c.patient.name).toBe('Bob');
    expect(c.intro).toContain('Sr. Carlos');
    expect(c.id).toBe(thor.id);
    expect(c.missionId).toBe('');
    expect(c.anamnesis.questions.map((q) => q.id)).toEqual(thor.anamnesis.questions.map((q) => q.id));
    expect(scoreCase(c, idealDecisions(c)).total).toBe(100);
    const errors = validateCase({ ...c, missionId: 'x' }, { referenceIds: new Set(Object.keys(REFERENCE_MAP)), vetidexIds: new Set(VETIDEX.map((e) => e.id)) });
    expect(errors).toEqual([]);
  });

  it('todo caso da história gera uma variante válida e com nota ideal 100', () => {
    for (const base of Object.values(CASES)) {
      const c = dailyCase(base, { ...p, caseId: base.id, name: 'Zeca', tutorName: base.patient.tutorName.startsWith('Dona') || base.patient.tutorName === 'Sofia' ? 'Dona Lúcia' : 'Sr. Carlos' }, 'dtutor_x');
      expect(JSON.stringify(c), base.id).not.toContain(`"${base.patient.name}"`);
      expect(scoreCase(c, idealDecisions(c)).total, base.id).toBe(100);
    }
  });

  it('atender um paciente do dia: marca como atendido, dá XP reduzido e não conclui missões', () => {
    const st = mk();
    pass(st, thor.id);
    st.data.calendar!.period = 0;
    const report = st.sleep(seq([0.1]));
    expect(report.arrived.length).toBeGreaterThan(0);
    const daily = st.calendar.patients[0];
    const xpBefore = st.data.totalXp;
    const c = { ...dailyCase(CASES[daily.caseId], daily, 'dtutor'), dailyUid: daily.uid };
    st.recordClinicalCase(c, scoreCase(c, idealDecisions(c)));
    expect(st.dailyPatient(daily.uid)?.status).toBe('treated');
    expect(st.data.totalXp).toBeGreaterThan(xpBefore);
    expect(st.calendar.period).toBe(1);
    const next = st.sleep(seq([0.9]));
    expect(next.discharged.some((d) => d.name === daily.name)).toBe(true);
    expect(st.dailyPatient(daily.uid)).toBeUndefined();
  });

  it('pacientes da história recebem alta no dia seguinte ao atendimento aprovado', () => {
    const st = mk();
    expect(st.check({ patientPresent: thor.id })).toBe(true);
    pass(st, thor.id);
    expect(st.check({ patientPresent: thor.id })).toBe(true); // ainda hoje no hospital
    st.sleep(seq([0.5]));
    expect(st.check({ patientPresent: thor.id })).toBe(false);
  });

  it('saves antigos ganham calendário ao carregar', () => {
    const old = newSaveData('Bia', { skin: 0, hairColor: 0, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false }) as any;
    delete old.calendar;
    const m = migrate(old);
    expect(m.calendar?.day).toBe(1);
  });
});

describe('Relatório de desempenho', () => {
  it('resume atendimentos, etapas e disciplinas e exporta CSV e texto', () => {
    const st = mk();
    pass(st, thor.id);
    const r = buildReport(st.data, { disciplines: DISCIPLINES, quests: QUESTS, vetidexTotal: VETIDEX.length });
    expect(r.student).toBe('Ana');
    expect(r.attendances).toBe(1);
    expect(r.approved).toBe(1);
    expect(r.average).toBe(100);
    expect(r.sections.every((s) => s.pct === 100)).toBe(true);
    expect(r.disciplines.find((d) => d.name.startsWith('Clínica'))!.xp).toBeGreaterThan(0);
    const csv = reportToCsv(r);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Aluno(a);Ana');
    expect(csv).toContain('Anamnese;100');
    const txt = reportToText(r);
    expect(txt).toContain('ATENDIMENTOS: 1');
    expect(txt).toContain('Thor');
  });

  it('aluno sem atividades: relatório sem divisões por zero', () => {
    const r = buildReport(mk().data, { disciplines: DISCIPLINES, quests: QUESTS, vetidexTotal: VETIDEX.length });
    expect(r.average).toBeNull();
    expect(reportToText(r)).toContain('nenhuma atividade');
    expect(reportToCsv(r)).not.toContain('NaN');
  });

  it('células com ponto e vírgula ou aspas são protegidas no CSV', () => {
    const st = mk();
    st.data.player.name = 'Ana; "Bia"';
    const csv = reportToCsv(buildReport(st.data, { disciplines: DISCIPLINES, quests: QUESTS, vetidexTotal: 1 }));
    expect(csv).toContain('"Ana; ""Bia"""');
  });
});
