/** Condições e efeitos usados por diálogos, visibilidade de NPCs e interações com objetos. */
import type { Expression } from '../../art/characters';

export interface Condition {
  flag?: string;
  notFlag?: string;
  questActive?: string;
  questDone?: string;
  questNotStarted?: string;
  questStarted?: string; // ativa ou concluída
  objectiveDone?: [string, string];
  objectiveNotDone?: [string, string];
  minLevel?: number;
  casePassed?: string;
  caseNotPassed?: string;
  hasItem?: string;
  hasPet?: boolean;
  all?: Condition[];
  any?: Condition[];
}

export type Effect =
  | { type: 'flag'; key: string; value?: boolean | number | string }
  | { type: 'objective'; quest: string; objective: string }
  | { type: 'startQuest'; quest: string }
  | { type: 'xp'; amount: number; reason: string }
  | { type: 'item'; id: string; qty?: number }
  | { type: 'dex'; ids: string[] }
  | { type: 'mastery'; discipline: string; skill: string; xp: number }
  | { type: 'startCase'; caseId: string }
  | { type: 'startMinigame'; id: string }
  | { type: 'startQuiz'; id: string }
  | { type: 'adoptPet' }
  | { type: 'petCheckup' }
  | { type: 'openReview' }
  | { type: 'openPanel'; panel: 'performance' | 'vetidex' | 'journal' | 'map' | 'inventory' }
  | { type: 'save' };

export interface DialogueChoice {
  text: string;
  next?: string;
  effects?: Effect[];
  when?: Condition;
  /** usado em perguntas educativas para feedback visual */
  correct?: boolean;
}

export interface DialogueNode {
  speaker?: string; // id do NPC, 'player' ou nome livre; padrão: NPC que iniciou
  expression?: Expression;
  text: string;
  next?: string;
  choices?: DialogueChoice[];
  effects?: Effect[];
}

export interface DialogueDef {
  /** primeira entrada cuja condição for verdadeira define o nó inicial */
  entries: { when?: Condition; start: string }[];
  nodes: Record<string, DialogueNode>;
}
