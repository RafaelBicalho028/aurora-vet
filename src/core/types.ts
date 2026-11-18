/**
 * Tipos compartilhados do estado do jogo e do salvamento.
 */

export type Direction = 'down' | 'up' | 'left' | 'right';

export type HairStyle = 'curto' | 'longo' | 'coque' | 'cacheado';
export type UniformType = 'jaleco' | 'pijama';

export interface Appearance {
  skin: number; // índice da paleta de pele
  hairColor: number; // índice da paleta de cabelo
  hairStyle: HairStyle;
  uniform: UniformType;
  uniformColor: number; // índice da paleta de uniforme
  glasses: boolean;
}

export interface PlayerState {
  name: string;
  appearance: Appearance;
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
}

export type QuestStatus = 'active' | 'completed';

export interface QuestProgress {
  status: QuestStatus;
  objectives: Record<string, boolean>;
  startedAt: number;
  completedAt?: number;
}

/** Resumo de um atendimento/minigame para o histórico acadêmico. */
export interface CaseRecord {
  caseId: string;
  title: string;
  kind: 'clinical' | 'minigame';
  date: number;
  attempt: number;
  total: number;
  sections: Record<string, number>; // ex.: anamnesis -> 16
  sectionMax: Record<string, number>;
  criticalErrors: string[];
  reviewTopics: string[];
  xpGained: number;
  disciplines: string[];
}

/** Item de revisão espaçada (sistema de caixas de Leitner). */
export interface ReviewItem {
  id: string; // id da pergunta de revisão
  sourceId: string; // caso de origem
  box: number; // 1..5
  due: number; // timestamp
  lastResult?: 'correct' | 'wrong';
  timesSeen: number;
}

export interface GameStats {
  playTimeSec: number;
  steps: number;
  casesCompleted: number;
}

export interface PetRecord {
  id: string;
  species: string;
  breed: string;
  name: string;
  adoptedAt: number;
  affection: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  player: PlayerState;
  totalXp: number;
  flags: Record<string, boolean | number | string>;
  quests: Record<string, QuestProgress>;
  inventory: Record<string, number>;
  vetidex: { unlocked: string[]; seen: string[] };
  /** XP por disciplina -> habilidade */
  disciplines: Record<string, Record<string, number>>;
  caseHistory: CaseRecord[];
  reviewItems: ReviewItem[];
  /** estatísticas por pergunta do banco (para sortear perguntas inéditas) */
  questionStats: Record<string, { seen: number; correct: number; last: number; lastCorrect: boolean }>;
  pets: { owned: PetRecord[]; companion: string | null };
  stats: GameStats;
}

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  textSpeed: 'lenta' | 'normal' | 'rapida';
  keybinds: Record<string, string[]>;
  showTouchControls: 'auto' | 'sempre' | 'nunca';
}
