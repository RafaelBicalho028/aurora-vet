/**
 * Banco de perguntas: sorteio sem repetição dentro da sessão, priorizando perguntas nunca vistas
 * e, entre as vistas, as que apareceram há mais tempo. Assim, quem reprova e tenta de novo
 * encontra perguntas diferentes enquanto houver perguntas inéditas no banco.
 * Funções puras (testadas em tests/questions.test.ts).
 */

export interface BankQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  refs: string[];
  vetidexId?: string;
}

export interface QuestionPool {
  id: string;
  title: string;
  discipline: string;
  skill: string;
  questions: BankQuestion[];
}

export interface QuestionStat {
  seen: number;
  correct: number;
  /** momento em que foi exibida pela última vez */
  last: number;
  lastCorrect: boolean;
}

export type QuestionStats = Record<string, QuestionStat>;

/** RNG determinístico (mulberry32) para sorteios reprodutíveis em testes. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sorteia `n` itens: primeiro os nunca vistos (em ordem aleatória), depois os vistos há mais tempo.
 * `keyOf` permite usar prefixos (ex.: estruturas anatômicas "hs:<id>").
 */
export function pickQuestions<T extends { id: string }>(
  items: T[],
  n: number,
  stats: QuestionStats,
  rand: () => number,
  keyOf: (t: T) => string = (t) => t.id,
): T[] {
  const scored = items.map((it) => {
    const s = stats[keyOf(it)];
    return { it, seen: s?.seen ?? 0, last: s?.last ?? 0, r: rand() };
  });
  scored.sort((a, b) => {
    const aNew = a.seen === 0 ? 0 : 1;
    const bNew = b.seen === 0 ? 0 : 1;
    if (aNew !== bNew) return aNew - bNew;
    if (a.last !== b.last) return a.last - b.last;
    return a.r - b.r;
  });
  const chosen = scored.slice(0, Math.min(n, items.length)).map((x) => x.it);
  // ordem de exibição também aleatória
  return shuffle(chosen, rand);
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Embaralha as alternativas mantendo o índice da correta. */
export function shuffleOptions(q: { options: string[]; correctIndex: number }, rand: () => number): { options: string[]; correct: number } {
  const order = shuffle(q.options.map((_, i) => i), rand);
  return { options: order.map((i) => q.options[i]), correct: order.indexOf(q.correctIndex) };
}

export function recordAnswer(stats: QuestionStats, key: string, correct: boolean, now: number): QuestionStats {
  const prev = stats[key] ?? { seen: 0, correct: 0, last: 0, lastCorrect: false };
  return { ...stats, [key]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0), last: now, lastCorrect: correct } };
}
