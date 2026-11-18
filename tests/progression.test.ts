/** Testes de XP, níveis, etapas, domínio e revisão espaçada. */
import { describe, expect, it } from 'vitest';
import { caseXp, levelFromXp, levelProgress, masteryTier, stageFor, xpForLevel, MASTERY_TIERS } from '../src/systems/progression/xp';
import { answerReview, dueReviews, scheduleReview, DAY, isMastered } from '../src/systems/review/spacedReview';
import { scoreMinigame, hotspotPoints } from '../src/systems/cases/minigameScoring';
import { MINIGAMES, QUESTION_POOLS } from '../src/content';

describe('Níveis', () => {
  it('curva de XP crescente e consistente', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(1000);
    for (let l = 1; l < 30; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(1000)).toBe(5);
    const p = levelProgress(150);
    expect(p).toMatchObject({ level: 2, current: 50, needed: 200 });
  });

  it('etapa depende de nível E de marcos da história', () => {
    expect(stageFor(20, 1).id).toBe(1);
    expect(stageFor(5, 2).id).toBe(2);
    expect(stageFor(4, 2).id).toBe(1);
  });

  it('níveis de domínio seguem Iniciante → Especialista', () => {
    expect(MASTERY_TIERS.map((t) => t.name)).toEqual(['Iniciante', 'Aprendiz', 'Intermediário', 'Avançado', 'Especialista']);
    expect(masteryTier(0).name).toBe('Iniciante');
    expect(masteryTier(60).name).toBe('Aprendiz');
    expect(masteryTier(799).name).toBe('Avançado');
    expect(masteryTier(5000)).toMatchObject({ name: 'Especialista', next: null, ratio: 1 });
  });

  it('XP de atendimento prioriza qualidade e reduz em repetições', () => {
    const first = caseXp(200, 80, { attempt: 1, alreadyPassed: false, passScore: 60 });
    expect(first).toBe(160 + 60);
    const retry = caseXp(200, 80, { attempt: 2, alreadyPassed: false, passScore: 60 });
    expect(retry).toBe(80 + 60);
    const practice = caseXp(200, 80, { attempt: 3, alreadyPassed: true, passScore: 60 });
    expect(practice).toBe(40);
    expect(caseXp(200, 40, { attempt: 1, alreadyPassed: false, passScore: 60 })).toBe(80);
  });
});

describe('Revisão espaçada (Leitner)', () => {
  const now = 1_000_000;
  it('agenda, promove em acertos e reinicia em erros', () => {
    let items = scheduleReview([], 'rq_x', 'caso', now);
    expect(dueReviews(items, now).map((i) => i.id)).toEqual(['rq_x']);
    items = answerReview(items, 'rq_x', true, now);
    expect(items[0].box).toBe(2);
    expect(items[0].due).toBe(now + DAY);
    expect(dueReviews(items, now)).toEqual([]);
    expect(dueReviews(items, now + DAY).length).toBe(1);
    items = answerReview(items, 'rq_x', false, now + DAY);
    expect(items[0].box).toBe(1);
    expect(items[0].lastResult).toBe('wrong');
  });
  it('erro repetido no mesmo conteúdo volta para a caixa 1', () => {
    let items = scheduleReview([], 'rq_x', 'caso', now);
    items = answerReview(items, 'rq_x', true, now);
    items = scheduleReview(items, 'rq_x', 'caso', now + 5);
    expect(items.length).toBe(1);
    expect(items[0].box).toBe(1);
  });
  it('item consolidado na caixa 5 sai da fila', () => {
    let items = scheduleReview([], 'rq_x', 'caso', now);
    let t = now;
    for (let i = 0; i < 4; i++) { items = answerReview(items, 'rq_x', true, t); t += 30 * DAY; }
    expect(items[0].box).toBe(5);
    expect(isMastered(items[0])).toBe(true);
    expect(dueReviews(items, t + 100 * DAY)).toEqual([]);
  });
});

describe('Minigame de anatomia', () => {
  const mg = Object.values(MINIGAMES)[0];
  const rounds = mg.hotspots.structures.slice(0, mg.hotspots.count).map((s) => s.id);
  const questions = QUESTION_POOLS[mg.quiz.pool].questions.slice(0, mg.quiz.count);
  const def = { hotspots: { pointsEach: mg.hotspots.pointsEach, rounds }, quiz: { pointsEach: mg.quiz.pointsEach, questions }, passScore: mg.passScore };
  it('tudo correto na primeira tentativa = 100', () => {
    const a = { hotspotTries: Object.fromEntries(rounds.map((r) => [r, 1])), quizAnswers: Object.fromEntries(questions.map((q) => [q.id, q.correctIndex])) };
    expect(scoreMinigame(def, a)).toMatchObject({ total: 100, passed: true, hotspotsPct: 100, quizPct: 100 });
  });
  it('segunda tentativa vale metade; revelado vale zero', () => {
    expect(hotspotPoints(1, 6)).toBe(6);
    expect(hotspotPoints(2, 6)).toBe(3);
    expect(hotspotPoints(3, 6)).toBe(0);
    expect(hotspotPoints(undefined, 6)).toBe(0);
  });
  it('sem respostas = 0 e reprovado', () => {
    expect(scoreMinigame(def, { hotspotTries: {}, quizAnswers: {} })).toMatchObject({ total: 0, passed: false });
  });
});
