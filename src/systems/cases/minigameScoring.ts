/**
 * Pontuação do minigame de anatomia (puro, testável).
 * Hotspots: acerto na 1ª tentativa = 100% dos pontos; na 2ª = 50%; depois = 0 (a resposta é revelada).
 * Quiz: acerto = pontos integrais; erro = 0.
 * A nota final é normalizada para 0–100.
 */
export interface MinigameAttempts {
  hotspotTries: Record<string, number>; // structureId -> nº de tentativas até acertar (ou >2 se revelado)
  quizAnswers: Record<string, number>; // questionId -> índice escolhido
}

export interface MinigameDef {
  hotspots: { pointsEach: number; rounds: string[] };
  quiz: { pointsEach: number; questions: { id: string; correctIndex: number }[] };
  passScore: number;
}

export function hotspotPoints(tries: number | undefined, pointsEach: number): number {
  if (!tries) return 0;
  if (tries === 1) return pointsEach;
  if (tries === 2) return pointsEach / 2;
  return 0;
}

export function scoreMinigame(def: MinigameDef, a: MinigameAttempts) {
  const hsMax = def.hotspots.rounds.length * def.hotspots.pointsEach;
  const qzMax = def.quiz.questions.length * def.quiz.pointsEach;
  const hs = def.hotspots.rounds.reduce((s, id) => s + hotspotPoints(a.hotspotTries[id], def.hotspots.pointsEach), 0);
  const qz = def.quiz.questions.reduce((s, q) => s + (a.quizAnswers[q.id] === q.correctIndex ? def.quiz.pointsEach : 0), 0);
  const max = hsMax + qzMax;
  const total = max === 0 ? 0 : Math.round(((hs + qz) / max) * 100);
  const hotspotsPct = hsMax ? Math.round((hs / hsMax) * 100) : 0;
  const quizPct = qzMax ? Math.round((qz / qzMax) * 100) : 0;
  return { total, hotspotsPct, quizPct, passed: total >= def.passScore };
}
