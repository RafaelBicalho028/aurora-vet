/** Registro do conteúdo educacional (casos, minigames, VetiDex e referências). */
import type { ClinicalCase } from '../systems/cases/caseTypes';
import thor from './cases/thor-prurido.json';
import mimi from './cases/mimi-hiporexia.json';
import pingo from './cases/pingo-diarreia.json';
import nino from './cases/nino-obstrucao.json';
import anatomia from './minigames/anatomia-intro.json';
import vetidex from './vetidex.json';
import references from './references.json';
import questionBank from './questionBank.json';
import type { QuestionPool, BankQuestion } from '../systems/questions/bank';

export const CASES: Record<string, ClinicalCase> = {
  [thor.id]: thor as unknown as ClinicalCase,
  [mimi.id]: mimi as unknown as ClinicalCase,
  [pingo.id]: pingo as unknown as ClinicalCase,
  [nino.id]: nino as unknown as ClinicalCase,
};

export type AnatomyMinigame = typeof anatomia;
export const MINIGAMES: Record<string, AnatomyMinigame> = { [anatomia.id]: anatomia };

export interface VetiDexEntry {
  id: string;
  name: string;
  category: string;
  image?: string;
  summary: string;
  manifestations: string[];
  science: string;
  didactic: string;
  professional: string;
  refs: string[];
  unlockHint: string;
}
export const VETIDEX_CATEGORIES: { id: string; name: string }[] = vetidex.categories;
export const VETIDEX: VetiDexEntry[] = vetidex.entries as VetiDexEntry[];
export const VETIDEX_MAP: Record<string, VetiDexEntry> = Object.fromEntries(VETIDEX.map((e) => [e.id, e]));

export interface Reference { id: string; type: string; citation: string; url?: string }
export const REFERENCES: Reference[] = references.references;
export const REFERENCE_MAP: Record<string, Reference> = Object.fromEntries(REFERENCES.map((r) => [r.id, r]));

export const QUESTION_POOLS: Record<string, QuestionPool> = Object.fromEntries((questionBank.pools as QuestionPool[]).map((p) => [p.id, p]));
export const BANK_QUESTIONS: Record<string, BankQuestion & { pool: string }> = Object.fromEntries(
  (questionBank.pools as QuestionPool[]).flatMap((p) => p.questions.map((q) => [q.id, { ...q, pool: p.id }])),
);
