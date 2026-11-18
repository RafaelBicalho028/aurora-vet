/** Testes do sistema de avaliação educacional (0–100, 20 pontos por etapa). */
import { describe, expect, it } from 'vitest';
import { CASES } from '../src/content';
import { collectedFindings, availableQuestions, scoreAnamnesis, scoreCase, scoreConduct, scoreDiagnosis, scorePhysicalExam, scoreTests, masteryGains, CRITICAL_CAP, listMistakes } from '../src/systems/cases/scoring';
import { emptyDecisions, type PlayerDecisions } from '../src/systems/cases/caseTypes';
import { idealDecisions } from './helpers';

const thor = CASES['caso_thor_prurido'];
const mimi = CASES['caso_mimi_hiporexia'];

describe('Anamnese', () => {
  it('sem perguntas = 0', () => {
    expect(scoreAnamnesis(thor, emptyDecisions()).score).toBe(0);
  });
  it('apenas perguntas essenciais = 16 de 20', () => {
    const d = emptyDecisions();
    d.askedQuestions = thor.anamnesis.questions.filter((q) => q.relevance === 'essential').map((q) => q.id);
    expect(scoreAnamnesis(thor, d).score).toBe(16);
  });
  it('perguntas irrelevantes custam 1 ponto cada (máx. 4)', () => {
    const d = idealDecisions(thor);
    d.askedQuestions.push('q_fogos', 'q_latidos');
    expect(scoreAnamnesis(thor, d).score).toBe(18);
  });
  it('perguntas de aprofundamento só ficam disponíveis após o pré-requisito', () => {
    expect(availableQuestions(thor, []).some((q) => q.id === 'q_gata_antipulgas')).toBe(false);
    expect(availableQuestions(thor, ['q_outros_animais']).some((q) => q.id === 'q_gata_antipulgas')).toBe(true);
  });
});

describe('Exame físico', () => {
  it('avaliar tudo sem interpretar perde os 6 pontos de interpretação', () => {
    const d = emptyDecisions();
    d.examined = thor.physicalExam.items.map((i) => i.id);
    expect(scorePhysicalExam(thor, d).score).toBe(14);
  });
  it('interpretação incorreta reduz a nota proporcionalmente', () => {
    const d = idealDecisions(thor);
    d.interpretations['e_derm'] = 'normal'; // está alterado
    const r = scorePhysicalExam(thor, d);
    expect(r.score).toBeCloseTo(14 + 6 * (13 / 14), 1);
    expect(r.feedback.some((f) => f.kind === 'bad' && f.text.includes('Exame dermatológico'))).toBe(true);
  });
});

describe('Exames complementares', () => {
  it('exames desnecessários custam 3 pontos cada (máx. 9)', () => {
    const d = idealDecisions(thor);
    d.requestedTests.push('t_radiografia', 't_ultrassom');
    expect(scoreTests(thor, d).score).toBe(14);
    d.requestedTests.push('t_biopsia', 't_alergia', 't_bioquimica');
    expect(scoreTests(thor, d).score).toBe(11);
  });
  it('exames aceitáveis não somam nem subtraem', () => {
    const d = idealDecisions(thor);
    d.requestedTests.push('t_hemograma', 't_tricograma');
    expect(scoreTests(thor, d).score).toBe(20);
  });
  it('pré-requisito de segurança: aspirado hepático antes do coagulograma é penalizado', () => {
    const d = idealDecisions(mimi);
    d.requestedTests = ['t_hemograma', 't_bioquimica', 't_ultrassom', 't_paaf', 't_coagulograma'];
    const r = scoreTests(mimi, d);
    expect(r.prerequisiteViolations).toEqual(['t_paaf']);
    expect(r.score).toBe(17);
  });
});

describe('Raciocínio diagnóstico', () => {
  it('evidência não coletada não conta, mesmo se marcada', () => {
    const d = idealDecisions(thor);
    d.examined = d.examined.filter((id) => id !== 'e_pente'); // não pesquisou pulgas
    expect(collectedFindings(thor, d)).not.toContain('f_pulgas');
    const r = scoreDiagnosis(thor, d);
    expect(r.score).toBeCloseTo(8 + 6 + 6 * (3 / 4), 1);
  });
  it('diagnóstico diferencial-chave incorreto como final vale 2 pontos', () => {
    const d = idealDecisions(thor);
    d.finalDiagnosis = 'h_atopia';
    expect(scoreDiagnosis(thor, d).score).toBe(2 + 6 + 6);
  });
  it('hipóteses improváveis custam 2 pontos nos diferenciais', () => {
    const d = idealDecisions(thor);
    d.differentials = [...d.differentials, 'h_hipotireoidismo'];
    expect(scoreDiagnosis(thor, d).score).toBe(8 + 4 + 6);
  });
  it('achado que não sustenta o diagnóstico custa 1 ponto', () => {
    const d = idealDecisions(mimi);
    d.evidence = [...d.evidence, 'f_fpli_normal']; // sustenta, sem penalidade
    expect(scoreDiagnosis(mimi, d).score).toBe(20);
    const d2 = idealDecisions(thor);
    d2.evidence = [...d2.evidence, 'f_raspado_negativo']; // sustenta DAPP também
    expect(scoreDiagnosis(thor, d2).score).toBe(20);
  });
});

describe('Conduta e decisões críticas', () => {
  it('conduta incorreta custa 5 pontos', () => {
    const d = idealDecisions(thor);
    d.conduct.push('c_antibiotico');
    expect(scoreConduct(thor, d).score).toBe(15);
  });
  it('conduta crítica zera a etapa e limita a nota total a 50', () => {
    const d = idealDecisions(thor);
    d.conduct.push('c_permetrina_gato');
    const r = scoreCase(thor, d);
    expect(r.sections.find((s) => s.id === 'conduct')!.score).toBe(0);
    expect(r.rawTotal).toBe(80);
    expect(r.total).toBe(CRITICAL_CAP);
    expect(r.capped).toBe(true);
    expect(r.outcome).toBe('critical');
    expect(r.passed).toBe(false);
    expect(r.criticalErrors.length).toBe(1);
  });
  it('não internar a gata com lipidose (alta para casa) é decisão crítica', () => {
    const d = idealDecisions(mimi);
    d.conduct = d.conduct.filter((c) => c !== 'c_internar').concat('c_casa_apetite');
    const r = scoreCase(mimi, d);
    expect(r.outcome).toBe('critical');
    expect(r.total).toBeLessThanOrEqual(CRITICAL_CAP);
  });
  it('condutas aceitáveis não alteram a nota', () => {
    const d = idealDecisions(mimi);
    d.conduct.push('c_vitk');
    expect(scoreConduct(mimi, d).score).toBe(20);
  });
});

describe('Nota total, revisão e domínio', () => {
  it('nota total é a soma das etapas (arredondada para baixo) e 100 só sem falhas', () => {
    const d = idealDecisions(thor);
    d.interpretations['e_fc'] = 'altered';
    const r = scoreCase(thor, d);
    expect(r.total).toBe(99);
    expect(r.total).toBeLessThan(100);
  });
  it('não responder nada resulta em nota baixa e reprovação', () => {
    const r = scoreCase(thor, emptyDecisions());
    expect(r.total).toBeLessThan(20);
    expect(r.passed).toBe(false);
    expect(r.outcome).toBe('partial');
  });
  it('erros agendam perguntas de revisão relacionadas', () => {
    const d: PlayerDecisions = idealDecisions(thor);
    d.conduct = d.conduct.filter((c) => c !== 'c_controle_todos').concat('c_so_cao');
    const r = scoreCase(thor, d);
    expect(listMistakes(thor, d)).toContain('c_so_cao');
    expect(r.triggeredReviewQuestions).toContain('rq_contactantes');
  });
  it('solução ideal não agenda revisões e não lista tópicos', () => {
    const r = scoreCase(mimi, idealDecisions(mimi));
    expect(r.triggeredReviewQuestions).toEqual([]);
    expect(r.reviewTopics).toEqual([]);
  });
  it('etapas abaixo de 70% geram tópicos de revisão', () => {
    const d = idealDecisions(thor);
    d.requestedTests = [];
    const r = scoreCase(thor, d);
    expect(r.reviewTopics.map((t) => t.section)).toContain('tests');
  });
  it('ganho de domínio é proporcional ao desempenho por etapa', () => {
    const r = scoreCase(thor, idealDecisions(thor));
    const g = masteryGains(thor, r, 1);
    expect(g.every((x) => x.xp === 40)).toBe(true);
    const half = masteryGains(thor, r, 0.5);
    expect(half.every((x) => x.xp === 20)).toBe(true);
  });
});
