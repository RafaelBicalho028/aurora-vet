/**
 * Esquema dos casos clínicos (armazenados em JSON em src/content/cases).
 * Documentado em docs/ADICIONANDO_CASOS.md.
 */

export type Relevance = 'essential' | 'complementary' | 'irrelevant';
export type TestCategory = 'indicated' | 'acceptable' | 'unnecessary';
export type ConductCategory = 'correct' | 'acceptable' | 'incorrect' | 'critical';
export type Plausibility = 'key' | 'plausible' | 'unlikely';

export interface CaseReferenceLink {
  /** id presente em src/content/references.json */
  refId: string;
  /** o que esta referência sustenta no caso */
  supports: string;
}

export interface Validation {
  status: 'pendente' | 'em_revisao' | 'validado';
  reviewer: string | null;
  date: string | null;
  notes: string;
}

export interface Patient {
  name: string;
  species: string; // 'canino' | 'felino' | ...
  speciesLabel: string;
  breed: string;
  sex: string;
  age: string;
  weightKg: number;
  sprite: string; // chave de textura do animal
  tutorName: string;
  tutorNpc: string; // id do NPC tutor (para o retrato)
  presentingComplaint: string;
}

export interface AnamnesisQuestion {
  id: string;
  category: string;
  text: string;
  answer: string;
  relevance: Relevance;
  /** perguntas que precisam ser feitas antes para esta aparecer (escolhas que modificam a informação obtida) */
  requires?: string[];
  findingId?: string;
  explanation: string;
}

export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  note?: string;
}

export interface ExamItem {
  id: string;
  label: string;
  group: 'vitais' | 'geral' | 'sistemas' | 'especifico';
  result: string;
  reference?: ReferenceRange | string;
  status: 'normal' | 'altered';
  relevance: Relevance;
  findingId?: string;
  explanation: string;
}

export interface ResultRow {
  param: string;
  value: string;
  ref: string;
  flag?: 'H' | 'L' | 'A' | '';
}

export interface TestItem {
  id: string;
  name: string;
  cost: number;
  turnaround: string;
  category: TestCategory;
  result: string;
  table?: ResultRow[];
  findingId?: string;
  justification: string;
  /** exames que precisam ser solicitados ANTES deste (ex.: coagulograma antes de aspirado hepático) */
  requires?: string[];
  requiresMessage?: string;
}

export interface Finding {
  id: string;
  label: string;
  /** ids de hipóteses que este achado sustenta */
  supports: string[];
}

export interface Hypothesis {
  id: string;
  name: string;
  plausibility: Plausibility;
  explanation: string;
  vetidexId?: string;
}

export interface Pharmacology {
  drugClass: string;
  mechanism: string;
  indications: string;
  contraindications: string;
  principles: string;
}

export interface ConductOption {
  id: string;
  text: string;
  type: 'observacao' | 'suporte' | 'tratamento' | 'encaminhamento' | 'internacao' | 'procedimento' | 'prevencao';
  category: ConductCategory;
  explanation: string;
  pharmacology?: Pharmacology;
  consequence?: string;
}

export interface ReviewQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** ids de decisões (pergunta, exame, achado, hipótese ou conduta) cujo erro agenda esta revisão */
  triggeredBy: string[];
}

export interface ReviewTopic {
  id: string;
  title: string;
  section: SectionId;
  vetidexId?: string;
}

export type SectionId = 'anamnesis' | 'physicalExam' | 'tests' | 'diagnosis' | 'conduct';

export interface ClinicalCase {
  schemaVersion: 1;
  id: string;
  title: string;
  missionId: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  minStage: number;
  baseXp: number;
  passScore: number;
  disciplines: { discipline: string; skill: string; section: SectionId | 'all' }[];
  educationalNotice: string;
  validation: Validation;
  references: CaseReferenceLink[];
  patient: Patient;
  intro: string;
  supervisor: { name: string; npc: string; tips: Record<SectionId, string> };
  anamnesis: { questions: AnamnesisQuestion[] };
  physicalExam: { items: ExamItem[] };
  tests: { items: TestItem[]; budgetHint: number };
  findings: Finding[];
  diagnosis: {
    hypotheses: Hypothesis[];
    correctId: string;
    expectedDifferentials: string[];
    keyEvidence: string[];
    minDifferentials: number;
    maxDifferentials: number;
    explanation: string;
  };
  conduct: { options: ConductOption[]; explanation: string };
  outcome: { success: string; partial: string; critical: string };
  vetidexUnlocks: string[];
  review: { topics: ReviewTopic[]; questions: ReviewQuestion[] };
}

/** Decisões do jogador registradas durante o atendimento. */
export interface PlayerDecisions {
  askedQuestions: string[];
  examined: string[];
  interpretations: Record<string, 'normal' | 'altered'>;
  requestedTests: string[];
  differentials: string[];
  finalDiagnosis: string | null;
  evidence: string[];
  conduct: string[];
}

export function emptyDecisions(): PlayerDecisions {
  return {
    askedQuestions: [],
    examined: [],
    interpretations: {},
    requestedTests: [],
    differentials: [],
    finalDiagnosis: null,
    evidence: [],
    conduct: [],
  };
}

export interface FeedbackItem {
  kind: 'good' | 'bad' | 'neutral' | 'critical';
  text: string;
  explanation?: string;
}

export interface SectionReport {
  id: SectionId;
  label: string;
  score: number;
  max: number;
  feedback: FeedbackItem[];
}

export interface ScoreReport {
  caseId: string;
  total: number;
  rawTotal: number;
  capped: boolean;
  passed: boolean;
  sections: SectionReport[];
  criticalErrors: string[];
  reviewTopics: ReviewTopic[];
  triggeredReviewQuestions: string[];
  /** decisões consideradas erros (ids), usadas para agendar revisões */
  mistakes: string[];
  outcome: 'success' | 'partial' | 'critical';
  totalCost: number;
}

export const SECTION_LABELS: Record<SectionId, string> = {
  anamnesis: 'Anamnese',
  physicalExam: 'Exame físico',
  tests: 'Exames complementares',
  diagnosis: 'Raciocínio diagnóstico',
  conduct: 'Conduta',
};

export const SECTION_ORDER: SectionId[] = ['anamnesis', 'physicalExam', 'tests', 'diagnosis', 'conduct'];
