/**
 * Revisão espaçada baseada em caixas de Leitner.
 * Caixa 1: imediata; 2: 1 dia; 3: 3 dias; 4: 7 dias; 5: 14 dias.
 * Acerto promove a caixa; erro volta para a caixa 1.
 */
import type { ReviewItem } from '../../core/types';

export const DAY = 24 * 60 * 60 * 1000;
export const BOX_INTERVALS = [0, 0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY]; // índice = caixa
export const MAX_BOX = 5;

export function scheduleReview(items: ReviewItem[], questionId: string, sourceId: string, now: number): ReviewItem[] {
  const existing = items.find((i) => i.id === questionId);
  if (existing) {
    // erro repetido no mesmo conteúdo: volta para a caixa 1 e fica disponível imediatamente
    return items.map((i) => (i.id === questionId ? { ...i, box: 1, due: now, lastResult: 'wrong' as const } : i));
  }
  return [...items, { id: questionId, sourceId, box: 1, due: now, timesSeen: 0 }];
}

export function answerReview(items: ReviewItem[], questionId: string, correct: boolean, now: number): ReviewItem[] {
  return items.map((i) => {
    if (i.id !== questionId) return i;
    const box = correct ? Math.min(MAX_BOX, i.box + 1) : 1;
    // na caixa 1 após erro, reaparece após 10 minutos para evitar repetição imediata em sequência
    const due = correct ? now + BOX_INTERVALS[box] : now + 10 * 60 * 1000;
    return { ...i, box, due, lastResult: correct ? 'correct' : 'wrong', timesSeen: i.timesSeen + 1 };
  });
}

export function dueReviews(items: ReviewItem[], now: number): ReviewItem[] {
  return items.filter((i) => i.due <= now && !(i.box === MAX_BOX && i.lastResult === 'correct')).sort((a, b) => a.box - b.box || a.due - b.due);
}

export function isMastered(item: ReviewItem): boolean {
  return item.box === MAX_BOX && item.lastResult === 'correct';
}
