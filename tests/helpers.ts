/** Utilitários compartilhados pelos testes. */
import type { ClinicalCase, PlayerDecisions } from '../src/systems/cases/caseTypes';

/** Decisões "ideais" derivadas dos dados do caso: tudo que é essencial/indicado/correto. */
export function idealDecisions(c: ClinicalCase): PlayerDecisions {
  const asked = c.anamnesis.questions.filter((q) => q.relevance !== 'irrelevant').map((q) => q.id);
  const examined = c.physicalExam.items.map((i) => i.id);
  const interpretations = Object.fromEntries(c.physicalExam.items.map((i) => [i.id, i.status]));
  // respeita a ordem de pré-requisitos
  const indicated = c.tests.items.filter((t) => t.category === 'indicated');
  const ordered = [...indicated].sort((a, b) => (a.requires?.length ?? 0) - (b.requires?.length ?? 0)).map((t) => t.id);
  return {
    askedQuestions: asked,
    examined,
    interpretations,
    requestedTests: ordered,
    differentials: c.diagnosis.expectedDifferentials,
    finalDiagnosis: c.diagnosis.correctId,
    evidence: c.diagnosis.keyEvidence,
    conduct: c.conduct.options.filter((o) => o.category === 'correct').map((o) => o.id),
  };
}

