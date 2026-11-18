/** Tempo clínico: estimativa por decisão, metas por caso e penalidade em urgências. */
import { describe, expect, it } from 'vitest';
import { CASES } from '../src/content';
import { clinicalMinutes, delayPenalty, parseTurnaroundMinutes, scoreCase, testMinutes } from '../src/systems/cases/scoring';
import { idealDecisions } from './helpers';

describe('Tempo clínico', () => {
  it('interpreta os tempos de resposta dos exames', () => {
    expect(parseTurnaroundMinutes('Imediato')).toBe(5);
    expect(parseTurnaroundMinutes('30 min')).toBe(30);
    expect(parseTurnaroundMinutes('4 h')).toBe(240);
    expect(parseTurnaroundMinutes('24 h')).toBe(1440);
    expect(parseTurnaroundMinutes('1 dia')).toBe(1440);
    expect(parseTurnaroundMinutes('10 a 21 dias')).toBe(14400);
    expect(testMinutes('15 min')).toBe(15);
    expect(testMinutes('4 h')).toBe(15); // resultado demorado: só o tempo de coleta
  });

  it('todos os exames de todos os casos têm tempo de resposta reconhecível', () => {
    for (const c of Object.values(CASES)) for (const t of c.tests.items) expect(parseTurnaroundMinutes(t.turnaround), `${c.id}/${t.id}: ${t.turnaround}`).toBeGreaterThan(0);
  });

  for (const c of Object.values(CASES)) {
    it(`${c.id}: a solução ideal cabe na meta de tempo e mantém nota 100`, () => {
      expect(c.clinicalTime, 'todo caso deve definir clinicalTime').toBeDefined();
      const d = idealDecisions(c);
      expect(clinicalMinutes(c, d)).toBeLessThanOrEqual(c.clinicalTime!.budgetMinutes);
      const r = scoreCase(c, d);
      expect(r.total).toBe(100);
      expect(r.delayPenalty).toBe(0);
    });
  }

  it('urgência: excesso de perguntas e exames lentos custa pontos na conduta, até −6', () => {
    const c = CASES['caso_nino_obstrucao'];
    expect(c.clinicalTime?.urgent).toBe(true);
    const d = idealDecisions(c);
    d.askedQuestions.push('q_sofa', 'q_brinquedo');
    d.requestedTests.push('t_radiografia', 't_pocus');
    const minutes = clinicalMinutes(c, d);
    expect(minutes).toBe(59 + 4 + 30 + 15);
    const r = scoreCase(c, d);
    expect(r.delayPenalty).toBe(6);
    const cond = r.sections.find((s) => s.id === 'conduct')!;
    expect(cond.score).toBe(14);
    expect(cond.feedback[0].text).toContain('Atraso');
  });

  it('casos estáveis não perdem pontos por tempo (apenas recebem aviso)', () => {
    const c = CASES['caso_thor_prurido'];
    const d = idealDecisions(c);
    d.requestedTests.push('t_hemograma', 't_tricograma', 't_cultura_fungica', 't_copro');
    d.askedQuestions.push('q_fogos');
    const extra = clinicalMinutes(c, { ...d, askedQuestions: [...d.askedQuestions, ...Array(40).fill('q_x')] });
    expect(delayPenalty(c, extra)).toBe(0);
  });
});
