/** Testes do estado do jogo: missões encadeadas, condições, recompensas e registro de atendimentos. */
import { describe, expect, it } from 'vitest';
import { GameState, newSaveData } from '../src/core/GameState';
import { MemoryStorage, SaveManager } from '../src/core/SaveManager';
import { CASES } from '../src/content';
import { scoreCase } from '../src/systems/cases/scoring';
import { idealDecisions } from './helpers';

const mk = () => new GameState(newSaveData('Ana', { skin: 0, hairColor: 0, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false }), new SaveManager(new MemoryStorage()));

describe('Missões', () => {
  it('concluir todos os objetivos conclui a missão, dá recompensas e inicia a próxima', () => {
    const st = mk();
    st.startQuest('q_boas_vindas');
    st.completeObjective('q_boas_vindas', 'o_lucas');
    st.completeObjective('q_boas_vindas', 'o_lab');
    expect(st.data.quests['q_boas_vindas'].status).toBe('active');
    st.completeObjective('q_boas_vindas', 'o_otavio');
    expect(st.data.quests['q_boas_vindas'].status).toBe('completed');
    expect(st.data.totalXp).toBe(30);
    expect(st.data.quests['q_aula_anatomia'].status).toBe('active');
  });
  it('objetivos de missões não iniciadas são ignorados', () => {
    const st = mk();
    st.completeObjective('q_biblioteca', 'o_vacinacao');
    expect(st.data.quests['q_biblioteca']).toBeUndefined();
  });
  it('recompensas de itens e VetiDex são aplicadas', () => {
    const st = mk();
    st.startQuest('q_biosseguranca');
    st.completeObjective('q_biosseguranca', 'o_hospital');
    st.completeObjective('q_biosseguranca', 'o_helena');
    expect(st.data.inventory['estetoscopio']).toBe(1);
    expect(st.data.vetidex.unlocked).toContain('prev_biosseguranca');
    expect(st.data.quests['q_primeiro_paciente'].status).toBe('active');
  });
});

describe('Condições e efeitos', () => {
  it('avalia condições compostas', () => {
    const st = mk();
    st.startQuest('q_boas_vindas');
    expect(st.check({ questActive: 'q_boas_vindas' })).toBe(true);
    expect(st.check({ questNotStarted: 'q_boas_vindas' })).toBe(false);
    expect(st.check({ objectiveNotDone: ['q_boas_vindas', 'o_lucas'] })).toBe(true);
    expect(st.check({ all: [{ questActive: 'q_boas_vindas' }, { minLevel: 2 }] })).toBe(false);
    expect(st.check({ any: [{ questDone: 'q_boas_vindas' }, { hasItem: 'cracha' }] })).toBe(true);
  });
  it('XP e domínio vindos de diálogos são concedidos apenas uma vez', () => {
    const st = mk();
    st.apply([{ type: 'mastery', discipline: 'fisiologia', skill: 'homeostase', xp: 25 }], 'livia.q3_ok');
    st.apply([{ type: 'mastery', discipline: 'fisiologia', skill: 'homeostase', xp: 25 }], 'livia.q3_ok');
    expect(st.data.disciplines['fisiologia']['homeostase']).toBe(25);
  });
});

describe('Registro de atendimentos', () => {
  it('atendimento aprovado conclui o objetivo, desbloqueia VetiDex e registra histórico', () => {
    const st = mk();
    st.startQuest('q_primeiro_paciente');
    const c = CASES['caso_thor_prurido'];
    const report = scoreCase(c, idealDecisions(c));
    const { xp, record } = st.recordClinicalCase(c, report);
    expect(xp).toBe(c.baseXp + Math.round(c.baseXp * 0.3));
    expect(record.total).toBe(100);
    expect(st.data.quests['q_primeiro_paciente'].objectives['o_atender']).toBe(true);
    expect(st.data.vetidex.unlocked).toContain('doenca_dapp');
    expect(st.data.caseHistory.length).toBe(1);
    expect(st.data.disciplines['clinica']['semiologia']).toBeGreaterThan(0);
    // treino posterior rende 25%
    const again = st.recordClinicalCase(c, report);
    expect(again.xp).toBe(Math.round(c.baseXp * 0.25));
  });
  it('atendimento com decisão crítica não conclui o objetivo e agenda revisão', () => {
    const st = mk();
    st.startQuest('q_primeiro_paciente');
    const c = CASES['caso_thor_prurido'];
    const d = idealDecisions(c);
    d.conduct.push('c_permetrina_gato');
    st.recordClinicalCase(c, scoreCase(c, d));
    expect(st.data.quests['q_primeiro_paciente'].objectives['o_atender']).toBe(false);
    expect(st.data.reviewItems.map((r) => r.id)).toContain('rq_permetrina');
    st.answerReviewItem('rq_permetrina', true);
    expect(st.data.reviewItems.find((r) => r.id === 'rq_permetrina')!.box).toBe(2);
  });
  it('objetivos dinâmicos (nível 5 e revisões) são verificados', () => {
    const st = mk();
    st.startQuest('q_proxima_etapa');
    st.addXp(1000, 'teste');
    expect(st.data.quests['q_proxima_etapa'].objectives['o_nivel']).toBe(true);
    for (let i = 0; i < 3; i++) st.answerReviewItem('rq_inexistente', false);
    expect(st.data.quests['q_proxima_etapa'].status).toBe('completed');
  });
});
