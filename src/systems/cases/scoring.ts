/**
 * Sistema de pontuação educacional (0–100), 20 pontos por etapa.
 * Funções puras: não dependem do Phaser nem do DOM (testadas em tests/scoring.test.ts).
 *
 * Regras (documentadas também em docs/ADICIONANDO_CASOS.md):
 *  Anamnese (20)      : 16 pts proporcionais às perguntas essenciais + 4 pts às complementares; −1 por pergunta irrelevante (máx. −4).
 *  Exame físico (20)  : 10 pts essenciais + 4 complementares + 6 pela interpretação correta (normal/alterado) dos itens avaliados.
 *  Exames compl. (20) : 20 pts proporcionais aos exames indicados; −3 por exame desnecessário (máx. −9);
 *                       −3 por exame solicitado sem o pré-requisito de segurança.
 *  Diagnóstico (20)   : 8 pts diagnóstico final correto (2 se for um diferencial-chave plausível);
 *                       6 pts diferenciais esperados (−2 por hipótese improvável); 6 pts evidências-chave (−1 por evidência que não sustenta).
 *  Conduta (20)       : 20 pts proporcionais às condutas corretas; −5 por conduta incorreta; conduta crítica zera a etapa.
 *  Global             : qualquer decisão crítica limita a nota total a 50.
 */
import {
  ClinicalCase,
  FeedbackItem,
  PlayerDecisions,
  ReviewTopic,
  ScoreReport,
  SectionId,
  SectionReport,
  SECTION_LABELS,
} from './caseTypes';

export const CRITICAL_CAP = 50;

/**
 * Tempo clínico estimado (minutos): pergunta = 2; sinal vital = 1; demais itens do exame = 2;
 * exame complementar = tempo de resposta quando até 60 min (aguarda-se o resultado) ou 15 min de coleta
 * quando o resultado demora mais (o atendimento segue enquanto isso).
 */
export function parseTurnaroundMinutes(s: string): number {
  const t = s.toLowerCase().trim();
  if (t.startsWith('imediato')) return 5;
  const n = parseFloat((t.match(/\d+([.,]\d+)?/) ?? ['0'])[0].replace(',', '.'));
  if (/dia/.test(t)) return n * 1440;
  if (/\bh\b|hora/.test(t)) return n * 60;
  if (/min/.test(t)) return n;
  return 30;
}

export function testMinutes(turnaround: string): number {
  const m = parseTurnaroundMinutes(turnaround);
  return m <= 60 ? m : 15;
}

export function clinicalMinutes(c: ClinicalCase, d: PlayerDecisions): number {
  let total = d.askedQuestions.length * 2;
  for (const id of d.examined) total += c.physicalExam.items.find((i) => i.id === id)?.group === 'vitais' ? 1 : 2;
  for (const id of d.requestedTests) { const t = c.tests.items.find((x) => x.id === id); if (t) total += testMinutes(t.turnaround); }
  return total;
}

/** Penalidade por atraso em caso urgente: −1 a cada 5 min além da meta (máx. −6), aplicada à conduta. */
export function delayPenalty(c: ClinicalCase, minutes: number): number {
  const ct = c.clinicalTime;
  if (!ct?.urgent || minutes <= ct.budgetMinutes) return 0;
  return Math.min(6, Math.ceil((minutes - ct.budgetMinutes) / 5));
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Achados efetivamente obtidos pelo jogador (somente estes podem justificar o diagnóstico). */
export function collectedFindings(c: ClinicalCase, d: PlayerDecisions): string[] {
  const ids = new Set<string>();
  for (const q of c.anamnesis.questions) if (q.findingId && d.askedQuestions.includes(q.id)) ids.add(q.findingId);
  for (const e of c.physicalExam.items) if (e.findingId && d.examined.includes(e.id)) ids.add(e.findingId);
  for (const t of c.tests.items) if (t.findingId && d.requestedTests.includes(t.id)) ids.add(t.findingId);
  return c.findings.filter((f) => ids.has(f.id)).map((f) => f.id);
}

/** Perguntas disponíveis considerando pré-requisitos (escolhas de diálogo que liberam informações). */
export function availableQuestions(c: ClinicalCase, asked: string[]) {
  return c.anamnesis.questions.filter((q) => !q.requires || q.requires.every((r) => asked.includes(r)));
}

function proportion(hit: number, total: number): number {
  return total === 0 ? 1 : hit / total;
}

export function scoreAnamnesis(c: ClinicalCase, d: PlayerDecisions): SectionReport {
  const qs = c.anamnesis.questions;
  const essential = qs.filter((q) => q.relevance === 'essential');
  const complementary = qs.filter((q) => q.relevance === 'complementary');
  const asked = new Set(d.askedQuestions);
  const eHit = essential.filter((q) => asked.has(q.id)).length;
  const cHit = complementary.filter((q) => asked.has(q.id)).length;
  const irrelevant = qs.filter((q) => q.relevance === 'irrelevant' && asked.has(q.id));

  const eWeight = complementary.length === 0 ? 20 : 16;
  const cWeight = complementary.length === 0 ? 0 : 4;
  let score = eWeight * proportion(eHit, essential.length) + cWeight * proportion(cHit, complementary.length);
  score -= Math.min(4, irrelevant.length);

  const feedback: FeedbackItem[] = [];
  for (const q of essential) {
    feedback.push(
      asked.has(q.id)
        ? { kind: 'good', text: `Perguntou: “${q.text}”`, explanation: q.explanation }
        : { kind: 'bad', text: `Faltou perguntar (essencial): “${q.text}”`, explanation: q.explanation },
    );
  }
  for (const q of complementary) {
    if (!asked.has(q.id)) feedback.push({ kind: 'neutral', text: `Pergunta complementar não feita: “${q.text}”`, explanation: q.explanation });
  }
  for (const q of irrelevant) feedback.push({ kind: 'bad', text: `Pergunta pouco útil neste caso: “${q.text}”`, explanation: q.explanation });

  return { id: 'anamnesis', label: SECTION_LABELS.anamnesis, score: round1(clamp(score, 0, 20)), max: 20, feedback };
}

export function scorePhysicalExam(c: ClinicalCase, d: PlayerDecisions): SectionReport {
  const items = c.physicalExam.items;
  const examined = new Set(d.examined);
  const essential = items.filter((i) => i.relevance === 'essential');
  const complementary = items.filter((i) => i.relevance === 'complementary');
  const eHit = essential.filter((i) => examined.has(i.id)).length;
  const cHit = complementary.filter((i) => examined.has(i.id)).length;

  const examinedItems = items.filter((i) => examined.has(i.id));
  const correctInterp = examinedItems.filter((i) => d.interpretations[i.id] === i.status).length;
  const interpRatio = examinedItems.length === 0 ? 0 : correctInterp / examinedItems.length;

  const eWeight = complementary.length === 0 ? 14 : 10;
  const cWeight = complementary.length === 0 ? 0 : 4;
  const score = eWeight * proportion(eHit, essential.length) + cWeight * proportion(cHit, complementary.length) + 6 * interpRatio;

  const feedback: FeedbackItem[] = [];
  for (const i of essential) {
    if (!examined.has(i.id)) feedback.push({ kind: 'bad', text: `Não avaliou (essencial): ${i.label}`, explanation: i.explanation });
  }
  for (const i of complementary) {
    if (!examined.has(i.id)) feedback.push({ kind: 'neutral', text: `Não avaliou (complementar): ${i.label}`, explanation: i.explanation });
  }
  for (const i of examinedItems) {
    const given = d.interpretations[i.id];
    const statusLabel = i.status === 'normal' ? 'normal' : 'alterado';
    if (given === i.status) {
      if (i.status === 'altered' || i.relevance === 'essential') {
        feedback.push({ kind: 'good', text: `${i.label}: interpretado corretamente como ${statusLabel}.`, explanation: i.explanation });
      }
    } else {
      feedback.push({
        kind: 'bad',
        text: given ? `${i.label}: interpretado como ${given === 'normal' ? 'normal' : 'alterado'}, mas está ${statusLabel}.` : `${i.label}: avaliado, mas não interpretado.`,
        explanation: i.explanation,
      });
    }
  }
  return { id: 'physicalExam', label: SECTION_LABELS.physicalExam, score: round1(clamp(score, 0, 20)), max: 20, feedback };
}

export function scoreTests(c: ClinicalCase, d: PlayerDecisions): SectionReport & { prerequisiteViolations: string[] } {
  const tests = c.tests.items;
  const requested = d.requestedTests;
  const reqSet = new Set(requested);
  const indicated = tests.filter((t) => t.category === 'indicated');
  const iHit = indicated.filter((t) => reqSet.has(t.id)).length;
  const unnecessary = tests.filter((t) => t.category === 'unnecessary' && reqSet.has(t.id));

  // Pré-requisitos: o exame exigido precisa ter sido solicitado ANTES.
  const prerequisiteViolations: string[] = [];
  requested.forEach((id, idx) => {
    const t = tests.find((x) => x.id === id);
    if (!t?.requires) return;
    const before = new Set(requested.slice(0, idx));
    if (!t.requires.every((r) => before.has(r))) prerequisiteViolations.push(t.id);
  });

  let score = 20 * proportion(iHit, indicated.length);
  score -= Math.min(9, unnecessary.length * 3);
  score -= prerequisiteViolations.length * 3;

  const feedback: FeedbackItem[] = [];
  for (const t of indicated) {
    feedback.push(
      reqSet.has(t.id)
        ? { kind: 'good', text: `Solicitou exame indicado: ${t.name}`, explanation: t.justification }
        : { kind: 'bad', text: `Não solicitou exame indicado: ${t.name}`, explanation: t.justification },
    );
  }
  for (const t of unnecessary) feedback.push({ kind: 'bad', text: `Exame desnecessário neste momento: ${t.name}`, explanation: t.justification });
  for (const t of tests.filter((x) => x.category === 'acceptable' && reqSet.has(x.id))) {
    feedback.push({ kind: 'neutral', text: `Exame aceitável, porém não decisivo: ${t.name}`, explanation: t.justification });
  }
  for (const id of prerequisiteViolations) {
    const t = tests.find((x) => x.id === id)!;
    feedback.push({ kind: 'bad', text: `Pré-requisito de segurança não respeitado: ${t.name}`, explanation: t.requiresMessage ?? '' });
  }
  return { id: 'tests', label: SECTION_LABELS.tests, score: round1(clamp(score, 0, 20)), max: 20, feedback, prerequisiteViolations };
}

export function scoreDiagnosis(c: ClinicalCase, d: PlayerDecisions): SectionReport {
  const dx = c.diagnosis;
  const hyp = (id: string) => dx.hypotheses.find((h) => h.id === id);
  const feedback: FeedbackItem[] = [];

  // Diagnóstico final (8)
  let finalPts = 0;
  const correct = hyp(dx.correctId)!;
  if (d.finalDiagnosis === dx.correctId) {
    finalPts = 8;
    feedback.push({ kind: 'good', text: `Diagnóstico mais provável correto: ${correct.name}.`, explanation: dx.explanation });
  } else {
    const chosen = d.finalDiagnosis ? hyp(d.finalDiagnosis) : undefined;
    if (chosen && chosen.plausibility === 'key') finalPts = 2;
    feedback.push({
      kind: 'bad',
      text: chosen ? `Diagnóstico escolhido: ${chosen.name}. O mais provável era: ${correct.name}.` : `Nenhum diagnóstico final foi escolhido. O mais provável era: ${correct.name}.`,
      explanation: (chosen ? chosen.explanation + ' ' : '') + dx.explanation,
    });
  }

  // Diagnósticos diferenciais (6)
  const diffs = new Set(d.differentials);
  const expectedHit = dx.expectedDifferentials.filter((id) => diffs.has(id)).length;
  const unlikely = d.differentials.map(hyp).filter((h) => h && h.plausibility === 'unlikely');
  let diffPts = 6 * proportion(expectedHit, dx.expectedDifferentials.length) - 2 * unlikely.length;
  diffPts = clamp(diffPts, 0, 6);
  for (const id of dx.expectedDifferentials) {
    const h = hyp(id)!;
    if (!diffs.has(id)) feedback.push({ kind: 'bad', text: `Diferencial importante ausente: ${h.name}`, explanation: h.explanation });
  }
  for (const h of unlikely) feedback.push({ kind: 'bad', text: `Hipótese pouco provável incluída: ${h!.name}`, explanation: h!.explanation });

  // Evidências que justificam (6) — só podem ser escolhidas se foram coletadas
  const collected = new Set(collectedFindings(c, d));
  const chosenEvidence = d.evidence.filter((e) => collected.has(e));
  const keyHit = dx.keyEvidence.filter((k) => chosenEvidence.includes(k)).length;
  const wrongEvidence = chosenEvidence.filter((e) => {
    const f = c.findings.find((x) => x.id === e);
    return !f || !f.supports.includes(dx.correctId);
  });
  let evPts = 6 * proportion(keyHit, dx.keyEvidence.length) - wrongEvidence.length;
  evPts = clamp(evPts, 0, 6);
  for (const k of dx.keyEvidence) {
    const f = c.findings.find((x) => x.id === k)!;
    if (!collected.has(k)) feedback.push({ kind: 'bad', text: `Evidência-chave não obtida durante o atendimento: ${f.label}` });
    else if (!chosenEvidence.includes(k)) feedback.push({ kind: 'bad', text: `Evidência-chave obtida, mas não usada na justificativa: ${f.label}` });
    else feedback.push({ kind: 'good', text: `Evidência bem utilizada: ${f.label}` });
  }
  for (const e of wrongEvidence) {
    const f = c.findings.find((x) => x.id === e);
    feedback.push({ kind: 'bad', text: `Achado que não sustenta o diagnóstico: ${f?.label ?? e}` });
  }

  const score = finalPts + diffPts + evPts;
  return { id: 'diagnosis', label: SECTION_LABELS.diagnosis, score: round1(clamp(score, 0, 20)), max: 20, feedback };
}

export function scoreConduct(c: ClinicalCase, d: PlayerDecisions): SectionReport & { critical: string[] } {
  const opts = c.conduct.options;
  const chosen = new Set(d.conduct);
  const correct = opts.filter((o) => o.category === 'correct');
  const cHit = correct.filter((o) => chosen.has(o.id)).length;
  const incorrect = opts.filter((o) => o.category === 'incorrect' && chosen.has(o.id));
  const critical = opts.filter((o) => o.category === 'critical' && chosen.has(o.id));

  let score = 20 * proportion(cHit, correct.length) - 5 * incorrect.length;
  if (critical.length > 0) score = 0;

  const feedback: FeedbackItem[] = [];
  for (const o of correct) {
    feedback.push(
      chosen.has(o.id)
        ? { kind: 'good', text: `Conduta adequada: ${o.text}`, explanation: o.explanation }
        : { kind: 'bad', text: `Conduta importante não escolhida: ${o.text}`, explanation: o.explanation },
    );
  }
  for (const o of incorrect) feedback.push({ kind: 'bad', text: `Conduta inadequada: ${o.text}`, explanation: o.explanation });
  for (const o of critical) {
    feedback.push({ kind: 'critical', text: `DECISÃO CRÍTICA: ${o.text}`, explanation: `${o.explanation}${o.consequence ? ' Consequência: ' + o.consequence : ''}` });
  }
  for (const o of opts.filter((x) => x.category === 'acceptable' && chosen.has(x.id))) {
    feedback.push({ kind: 'neutral', text: `Conduta aceitável: ${o.text}`, explanation: o.explanation });
  }
  return { id: 'conduct', label: SECTION_LABELS.conduct, score: round1(clamp(score, 0, 20)), max: 20, feedback, critical: critical.map((o) => o.id) };
}

/** Lista de decisões consideradas erro — usada para agendar perguntas de revisão espaçada. */
export function listMistakes(c: ClinicalCase, d: PlayerDecisions): string[] {
  const m: string[] = [];
  const asked = new Set(d.askedQuestions);
  c.anamnesis.questions.forEach((q) => {
    if (q.relevance === 'essential' && !asked.has(q.id)) m.push(q.id);
    if (q.relevance === 'irrelevant' && asked.has(q.id)) m.push(q.id);
  });
  const ex = new Set(d.examined);
  c.physicalExam.items.forEach((i) => {
    if (i.relevance === 'essential' && !ex.has(i.id)) m.push(i.id);
    if (ex.has(i.id) && d.interpretations[i.id] !== i.status) m.push(i.id);
  });
  const req = new Set(d.requestedTests);
  c.tests.items.forEach((t) => {
    if (t.category === 'indicated' && !req.has(t.id)) m.push(t.id);
    if (t.category === 'unnecessary' && req.has(t.id)) m.push(t.id);
  });
  if (d.finalDiagnosis !== c.diagnosis.correctId) m.push(c.diagnosis.correctId);
  c.diagnosis.expectedDifferentials.forEach((h) => { if (!d.differentials.includes(h)) m.push(h); });
  c.diagnosis.keyEvidence.forEach((k) => { if (!d.evidence.includes(k)) m.push(k); });
  const ch = new Set(d.conduct);
  c.conduct.options.forEach((o) => {
    if (o.category === 'correct' && !ch.has(o.id)) m.push(o.id);
    if ((o.category === 'incorrect' || o.category === 'critical') && ch.has(o.id)) m.push(o.id);
  });
  return Array.from(new Set(m));
}

export function scoreCase(c: ClinicalCase, d: PlayerDecisions): ScoreReport {
  const anam = scoreAnamnesis(c, d);
  const exam = scorePhysicalExam(c, d);
  const tests = scoreTests(c, d);
  const dx = scoreDiagnosis(c, d);
  const cond = scoreConduct(c, d);
  const minutes = clinicalMinutes(c, d);
  const penalty = delayPenalty(c, minutes);
  if (c.clinicalTime) {
    const ct = c.clinicalTime;
    if (penalty > 0) {
      cond.score = round1(Math.max(0, cond.score - penalty));
      cond.feedback.unshift({ kind: 'bad', text: `Atraso no atendimento de urgência: ${minutes} min até a conduta (meta: ${ct.budgetMinutes} min). −${penalty} pts.`, explanation: `${ct.delayConsequence ?? ''} Priorize o que muda a conduta imediata; o restante da investigação pode vir após a estabilização.` });
    } else if (ct.urgent) {
      cond.feedback.unshift({ kind: 'good', text: `Tempo de atendimento adequado para a urgência: ${minutes} min (meta: ${ct.budgetMinutes} min).` });
    } else if (minutes > ct.budgetMinutes) {
      anam.feedback.push({ kind: 'neutral', text: `Atendimento longo: ${minutes} min estimados (referência: ${ct.budgetMinutes} min). Em casos estáveis isso não reduz a nota, mas em emergências pode custar caro.` });
    }
  }
  const sections: SectionReport[] = [anam, exam, tests, dx, cond];

  // arredonda para baixo: 100 apenas quando não há nenhuma falha
  const rawTotal = Math.floor(sections.reduce((s, x) => s + x.score, 0) + 1e-6);
  const criticalErrors = cond.critical.map((id) => c.conduct.options.find((o) => o.id === id)!.text);
  const capped = criticalErrors.length > 0 && rawTotal > CRITICAL_CAP;
  const total = criticalErrors.length > 0 ? Math.min(rawTotal, CRITICAL_CAP) : rawTotal;

  const mistakes = listMistakes(c, d);
  const mistakeSet = new Set(mistakes);
  const triggeredReviewQuestions = c.review.questions.filter((q) => q.triggeredBy.some((t) => mistakeSet.has(t))).map((q) => q.id);

  // Tópicos de revisão: seções com desempenho abaixo de 70%.
  const weakSections = new Set<SectionId>(sections.filter((s) => s.score / s.max < 0.7).map((s) => s.id));
  const reviewTopics: ReviewTopic[] = c.review.topics.filter((t) => weakSections.has(t.section));

  const totalCost = d.requestedTests.reduce((sum, id) => sum + (c.tests.items.find((t) => t.id === id)?.cost ?? 0), 0);

  const outcome: ScoreReport['outcome'] = criticalErrors.length > 0 ? 'critical' : total >= c.passScore ? 'success' : 'partial';

  return {
    caseId: c.id,
    total,
    rawTotal,
    capped,
    passed: criticalErrors.length === 0 && total >= c.passScore,
    sections,
    criticalErrors,
    reviewTopics,
    triggeredReviewQuestions,
    mistakes,
    outcome,
    totalCost,
    minutes,
    budgetMinutes: c.clinicalTime?.budgetMinutes ?? null,
    delayPenalty: penalty,
  };
}

/** Distribui XP de domínio entre as habilidades da disciplina de acordo com o desempenho em cada etapa. */
export function masteryGains(c: ClinicalCase, report: ScoreReport, factor: number): { discipline: string; skill: string; xp: number }[] {
  const bySection = new Map(report.sections.map((s) => [s.id, s.score / s.max]));
  return c.disciplines.map((tag) => {
    const ratio = tag.section === 'all' ? report.total / 100 : bySection.get(tag.section) ?? 0;
    return { discipline: tag.discipline, skill: tag.skill, xp: Math.round(40 * ratio * factor) };
  });
}
