/**
 * Curva de experiência, etapas acadêmicas e níveis de domínio.
 * Funções puras — testadas em tests/progression.test.ts.
 */

/** XP acumulado necessário para atingir o nível `level` (nível 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level; // 2:100, 3:300, 4:600, 5:1000, 6:1500 ...
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (totalXp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(totalXp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = levelFromXp(totalXp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const current = totalXp - base;
  const needed = next - base;
  return { level, current, needed, ratio: needed > 0 ? current / needed : 1 };
}

export interface AcademicStage {
  id: number;
  title: string;
  description: string;
  minLevel: number;
}

/** Etapas da jornada. Representam progresso no jogo, NÃO habilitação profissional. */
export const STAGES: AcademicStage[] = [
  { id: 1, title: 'Calouro Veterinário', minLevel: 1, description: 'Anatomia, histologia, fisiologia, biossegurança e fundamentos da profissão.' },
  { id: 2, title: 'Estudante em Formação', minLevel: 5, description: 'Microbiologia, parasitologia, farmacologia, patologia e semiologia.' },
  { id: 3, title: 'Estagiário Clínico', minLevel: 9, description: 'Atendimentos supervisionados, exames e diagnósticos diferenciais.' },
  { id: 4, title: 'Médico Veterinário em Treinamento', minLevel: 14, description: 'Casos complexos, emergências, saúde coletiva e procedimentos supervisionados.' },
  { id: 5, title: 'Especialista Veterinário', minLevel: 20, description: 'Casos avançados envolvendo diferentes espécies e especialidades.' },
];

/**
 * A etapa depende do nível E de marcos da história (flags), respeitando pré-requisitos acadêmicos.
 * `milestones` contém o maior número de etapa liberado pela história.
 */
export function stageFor(level: number, storyStageUnlocked: number): AcademicStage {
  let stage = STAGES[0];
  for (const s of STAGES) {
    if (level >= s.minLevel && s.id <= storyStageUnlocked) stage = s;
  }
  return stage;
}

export const MASTERY_TIERS = [
  { name: 'Iniciante', min: 0 },
  { name: 'Aprendiz', min: 60 },
  { name: 'Intermediário', min: 180 },
  { name: 'Avançado', min: 400 },
  { name: 'Especialista', min: 800 },
] as const;

export function masteryTier(xp: number): { name: string; index: number; next: number | null; ratio: number } {
  let index = 0;
  for (let i = 0; i < MASTERY_TIERS.length; i++) if (xp >= MASTERY_TIERS[i].min) index = i;
  const cur = MASTERY_TIERS[index].min;
  const next = index < MASTERY_TIERS.length - 1 ? MASTERY_TIERS[index + 1].min : null;
  const ratio = next === null ? 1 : (xp - cur) / (next - cur);
  return { name: MASTERY_TIERS[index].name, index, next, ratio };
}

/**
 * XP de um atendimento. Prioriza a qualidade do raciocínio (pontuação), não a velocidade.
 * - primeira tentativa: 100% ; tentativas antes de ser aprovado: 50% ; revisões após aprovação: 25%.
 * - bônus de aprovação (score >= passScore) apenas na primeira aprovação.
 */
export function caseXp(baseXp: number, score: number, opts: { attempt: number; alreadyPassed: boolean; passScore: number }): number {
  const factor = opts.alreadyPassed ? 0.25 : opts.attempt <= 1 ? 1 : 0.5;
  let xp = Math.round(baseXp * (Math.max(0, Math.min(100, score)) / 100) * factor);
  if (!opts.alreadyPassed && score >= opts.passScore) xp += Math.round(baseXp * 0.3);
  return xp;
}
