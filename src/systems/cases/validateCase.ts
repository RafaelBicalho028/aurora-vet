/**
 * Verificações de integridade dos casos clínicos.
 * Impede dados clínicos incompletos e decisões sem critério de correção.
 * Executado nos testes automatizados e também em tempo de execução (modo dev) ao carregar os casos.
 */
import { ClinicalCase, SECTION_ORDER } from './caseTypes';
import { collectedFindings } from './scoring';

export interface ValidationContext {
  referenceIds: Set<string>;
  vetidexIds: Set<string>;
  textureKeys?: Set<string>;
}

const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

export function validateCase(c: ClinicalCase, ctx: ValidationContext): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(`[${c?.id ?? '?'}] ${m}`);

  if (c.schemaVersion !== 1) err('schemaVersion deve ser 1');
  for (const k of ['id', 'title', 'missionId', 'educationalNotice', 'intro'] as const) if (!nonEmpty(c[k])) err(`campo obrigatório vazio: ${k}`);
  if (!(c.difficulty >= 1 && c.difficulty <= 5)) err('difficulty deve estar entre 1 e 5');
  if (!(c.passScore > 0 && c.passScore <= 100)) err('passScore inválido');
  if (!c.validation || !['pendente', 'em_revisao', 'validado'].includes(c.validation.status)) err('validation.status inválido');
  if (c.validation?.status === 'validado' && (!nonEmpty(c.validation.reviewer) || !nonEmpty(c.validation.date))) {
    err('caso marcado como validado precisa de reviewer e date');
  }

  // Referências: obrigatórias e precisam existir no catálogo central (não inventar referências).
  if (!c.references?.length) err('o caso precisa de pelo menos uma referência verificável');
  for (const r of c.references ?? []) {
    if (!ctx.referenceIds.has(r.refId)) err(`referência desconhecida: ${r.refId}`);
    if (!nonEmpty(r.supports)) err(`referência ${r.refId} sem descrição do que sustenta`);
  }

  // Paciente
  const p = c.patient;
  for (const k of ['name', 'species', 'speciesLabel', 'breed', 'sex', 'age', 'sprite', 'tutorName', 'presentingComplaint'] as const) {
    if (!nonEmpty(p?.[k])) err(`patient.${k} obrigatório`);
  }
  if (ctx.textureKeys && p && !ctx.textureKeys.has(p.sprite)) err(`sprite do paciente inexistente: ${p.sprite}`);

  // IDs únicos em todo o caso
  const allIds = [
    ...c.anamnesis.questions.map((x) => x.id),
    ...c.physicalExam.items.map((x) => x.id),
    ...c.tests.items.map((x) => x.id),
    ...c.findings.map((x) => x.id),
    ...c.diagnosis.hypotheses.map((x) => x.id),
    ...c.conduct.options.map((x) => x.id),
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) err(`id duplicado: ${id}`);
    seen.add(id);
  }
  const findingIds = new Set(c.findings.map((f) => f.id));
  const hypIds = new Set(c.diagnosis.hypotheses.map((h) => h.id));
  const qIds = new Set(c.anamnesis.questions.map((q) => q.id));
  const testIds = new Set(c.tests.items.map((t) => t.id));

  // Anamnese
  if (!c.anamnesis.questions.some((q) => q.relevance === 'essential')) err('anamnese sem perguntas essenciais');
  for (const q of c.anamnesis.questions) {
    if (!nonEmpty(q.text) || !nonEmpty(q.answer) || !nonEmpty(q.explanation) || !nonEmpty(q.category)) err(`pergunta incompleta: ${q.id}`);
    if (!['essential', 'complementary', 'irrelevant'].includes(q.relevance)) err(`relevância inválida: ${q.id}`);
    if (q.findingId && !findingIds.has(q.findingId)) err(`pergunta ${q.id} aponta para achado inexistente ${q.findingId}`);
    for (const r of q.requires ?? []) if (!qIds.has(r)) err(`pergunta ${q.id} requer pergunta inexistente ${r}`);
  }
  // Toda pergunta precisa ser alcançável (sem ciclos de pré-requisito)
  const reachable = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const q of c.anamnesis.questions) {
      if (!reachable.has(q.id) && (q.requires ?? []).every((r) => reachable.has(r))) {
        reachable.add(q.id);
        changed = true;
      }
    }
  }
  for (const q of c.anamnesis.questions) if (!reachable.has(q.id)) err(`pergunta inalcançável (ciclo de pré-requisitos): ${q.id}`);

  // Exame físico
  if (!c.physicalExam.items.some((i) => i.relevance === 'essential')) err('exame físico sem itens essenciais');
  for (const i of c.physicalExam.items) {
    if (!nonEmpty(i.label) || !nonEmpty(i.result) || !nonEmpty(i.explanation)) err(`item de exame incompleto: ${i.id}`);
    if (!['normal', 'altered'].includes(i.status)) err(`status inválido no exame ${i.id}`);
    if (i.findingId && !findingIds.has(i.findingId)) err(`exame ${i.id} aponta para achado inexistente ${i.findingId}`);
    if (i.reference && typeof i.reference === 'object' && !(i.reference.min <= i.reference.max)) err(`faixa de referência inválida em ${i.id}`);
  }

  // Exames complementares
  if (!c.tests.items.some((t) => t.category === 'indicated')) err('nenhum exame complementar indicado');
  for (const t of c.tests.items) {
    if (!nonEmpty(t.name) || !nonEmpty(t.result) || !nonEmpty(t.justification) || !nonEmpty(t.turnaround)) err(`exame incompleto: ${t.id}`);
    if (!(t.cost >= 0)) err(`custo inválido: ${t.id}`);
    if (!['indicated', 'acceptable', 'unnecessary'].includes(t.category)) err(`categoria inválida: ${t.id}`);
    if (t.findingId && !findingIds.has(t.findingId)) err(`exame ${t.id} aponta para achado inexistente ${t.findingId}`);
    for (const r of t.requires ?? []) if (!testIds.has(r)) err(`exame ${t.id} requer exame inexistente ${r}`);
    if (t.requires?.length && !nonEmpty(t.requiresMessage)) err(`exame ${t.id} com pré-requisito precisa de requiresMessage`);
  }

  // Achados
  for (const f of c.findings) {
    if (!nonEmpty(f.label)) err(`achado sem rótulo: ${f.id}`);
    for (const s of f.supports) if (!hypIds.has(s)) err(`achado ${f.id} sustenta hipótese inexistente ${s}`);
  }

  // Diagnóstico
  const dx = c.diagnosis;
  if (!hypIds.has(dx.correctId)) err('diagnosis.correctId não está entre as hipóteses');
  if (!nonEmpty(dx.explanation)) err('diagnosis.explanation obrigatório');
  if (hypIds.has(dx.correctId) && c.diagnosis.hypotheses.find((h) => h.id === dx.correctId)!.plausibility !== 'key') {
    err('o diagnóstico correto deve ter plausibility "key"');
  }
  if (!dx.expectedDifferentials.length) err('defina expectedDifferentials');
  for (const h of dx.expectedDifferentials) if (!hypIds.has(h)) err(`diferencial esperado inexistente: ${h}`);
  if (dx.minDifferentials < 1 || dx.maxDifferentials < dx.minDifferentials) err('limites de diferenciais inválidos');
  if (dx.expectedDifferentials.length > dx.maxDifferentials) err('expectedDifferentials excede maxDifferentials');
  if (!dx.keyEvidence.length) err('o diagnóstico precisa de evidências-chave (evita resolução por adivinhação)');
  for (const k of dx.keyEvidence) {
    if (!findingIds.has(k)) err(`evidência-chave inexistente: ${k}`);
    const f = c.findings.find((x) => x.id === k);
    if (f && !f.supports.includes(dx.correctId)) err(`evidência-chave ${k} não sustenta o diagnóstico correto`);
  }
  for (const h of dx.hypotheses) if (!nonEmpty(h.name) || !nonEmpty(h.explanation)) err(`hipótese incompleta: ${h.id}`);
  for (const h of dx.hypotheses) if (h.vetidexId && !ctx.vetidexIds.has(h.vetidexId)) err(`hipótese ${h.id} aponta para VetiDex inexistente ${h.vetidexId}`);

  // Toda evidência-chave deve ser obtível por alguma ação do jogador
  const everything = collectedFindings(c, {
    askedQuestions: [...qIds],
    examined: c.physicalExam.items.map((i) => i.id),
    interpretations: {},
    requestedTests: [...testIds],
    differentials: [],
    finalDiagnosis: null,
    evidence: [],
    conduct: [],
  });
  for (const k of dx.keyEvidence) if (!everything.includes(k)) err(`evidência-chave ${k} não pode ser obtida em nenhuma etapa`);

  // Conduta
  const co = c.conduct.options;
  if (!co.some((o) => o.category === 'correct')) err('nenhuma conduta correta definida');
  for (const o of co) {
    if (!nonEmpty(o.text) || !nonEmpty(o.explanation)) err(`conduta incompleta: ${o.id}`);
    if (!['correct', 'acceptable', 'incorrect', 'critical'].includes(o.category)) err(`categoria de conduta inválida: ${o.id}`);
    if (o.category === 'critical' && !nonEmpty(o.consequence)) err(`conduta crítica ${o.id} precisa descrever a consequência clínica`);
    if (o.pharmacology) {
      const ph = o.pharmacology;
      for (const k of ['drugClass', 'mechanism', 'indications', 'contraindications', 'principles'] as const) if (!nonEmpty(ph[k])) err(`farmacologia incompleta em ${o.id}: ${k}`);
    }
  }

  // Supervisor e desfechos
  for (const s of SECTION_ORDER) if (!nonEmpty(c.supervisor?.tips?.[s])) err(`dica do supervisor ausente para ${s}`);
  for (const k of ['success', 'partial', 'critical'] as const) if (!nonEmpty(c.outcome?.[k])) err(`outcome.${k} obrigatório`);

  // VetiDex e revisão
  for (const v of c.vetidexUnlocks) if (!ctx.vetidexIds.has(v)) err(`vetidexUnlocks inexistente: ${v}`);
  for (const t of c.review.topics) {
    if (!SECTION_ORDER.includes(t.section)) err(`tópico de revisão com seção inválida: ${t.id}`);
    if (t.vetidexId && !ctx.vetidexIds.has(t.vetidexId)) err(`tópico ${t.id} aponta para VetiDex inexistente`);
  }
  if (!c.review.questions.length) err('o caso precisa de perguntas de revisão');
  for (const q of c.review.questions) {
    if (q.options.length < 2) err(`pergunta de revisão ${q.id} precisa de 2+ opções`);
    if (!(q.correctIndex >= 0 && q.correctIndex < q.options.length)) err(`correctIndex inválido em ${q.id}`);
    if (!nonEmpty(q.explanation)) err(`pergunta de revisão sem explicação: ${q.id}`);
    for (const t of q.triggeredBy) if (!seen.has(t)) err(`pergunta de revisão ${q.id} disparada por id inexistente ${t}`);
  }
  return errors;
}
