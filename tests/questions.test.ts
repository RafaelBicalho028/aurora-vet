/** Sorteio de perguntas: variedade entre tentativas, embaralhamento e casos com ordem variável. */
import { describe, expect, it } from 'vitest';
import { pickQuestions, recordAnswer, seededRandom, shuffleOptions, type QuestionStats } from '../src/systems/questions/bank';
import { QUESTION_POOLS, CASES, MINIGAMES } from '../src/content';
import { shuffledCase } from '../src/systems/cases/shuffleCase';
import { scoreCase } from '../src/systems/cases/scoring';
import { idealDecisions } from './helpers';

const pool = QUESTION_POOLS['anatomia_comparada'].questions;

describe('Sorteio de perguntas', () => {
  it('não repete perguntas dentro da mesma sessão', () => {
    const picked = pickQuestions(pool, 6, {}, seededRandom(1));
    expect(new Set(picked.map((q) => q.id)).size).toBe(6);
  });

  it('após reprovar, a nova tentativa traz perguntas inéditas enquanto houver no banco', () => {
    let stats: QuestionStats = {};
    const seenSoFar = new Set<string>();
    let t = 1000;
    for (let attempt = 0; attempt < Math.floor(pool.length / 6); attempt++) {
      const picked = pickQuestions(pool, 6, stats, seededRandom(attempt + 7));
      for (const q of picked) {
        expect(seenSoFar.has(q.id), `repetiu ${q.id} na tentativa ${attempt + 1}`).toBe(false);
        seenSoFar.add(q.id);
        stats = recordAnswer(stats, q.id, false, t++);
      }
    }
  });

  it('com o banco todo visto, volta primeiro às perguntas vistas há mais tempo', () => {
    let stats: QuestionStats = {};
    pool.forEach((q, i) => { stats = recordAnswer(stats, q.id, true, 100 + i); });
    const picked = pickQuestions(pool, 3, stats, seededRandom(3)).map((q) => q.id).sort();
    expect(picked).toEqual(pool.slice(0, 3).map((q) => q.id).sort());
  });

  it('estruturas anatômicas usam chave própria e também variam', () => {
    const mg = Object.values(MINIGAMES)[0];
    const s = mg.hotspots.structures;
    const first = pickQuestions(s, mg.hotspots.count, {}, seededRandom(5), (x) => `hs:${x.id}`);
    let stats: QuestionStats = {};
    first.forEach((x, i) => { stats = recordAnswer(stats, `hs:${x.id}`, false, i + 1); });
    const second = pickQuestions(s, mg.hotspots.count, stats, seededRandom(6), (x) => `hs:${x.id}`);
    const overlap = second.filter((x) => first.some((y) => y.id === x.id)).length;
    expect(overlap).toBe(Math.max(0, mg.hotspots.count * 2 - s.length));
  });

  it('embaralhar alternativas preserva a resposta correta', () => {
    for (let seed = 0; seed < 20; seed++) {
      const q = pool[seed % pool.length];
      const sh = shuffleOptions(q, seededRandom(seed));
      expect(sh.options[sh.correct]).toBe(q.options[q.correctIndex]);
      expect([...sh.options].sort()).toEqual([...q.options].sort());
    }
  });

  it('estatísticas registram vistas, acertos e última resposta', () => {
    let s: QuestionStats = {};
    s = recordAnswer(s, 'x', true, 10);
    s = recordAnswer(s, 'x', false, 20);
    expect(s.x).toEqual({ seen: 2, correct: 1, last: 20, lastCorrect: false });
  });
});

describe('Casos com ordem embaralhada nas novas tentativas', () => {
  for (const c of Object.values(CASES)) {
    it(`${c.id}: mesmo conteúdo, ordem diferente e mesma nota ideal`, () => {
      const s1 = shuffledCase(c, 1);
      const s2 = shuffledCase(c, 2);
      const ids = (x: typeof c) => x.conduct.options.map((o) => o.id);
      expect([...ids(s1)].sort()).toEqual([...ids(c)].sort());
      expect(ids(s1).join() !== ids(c).join() || ids(s2).join() !== ids(c).join()).toBe(true);
      expect(scoreCase(s1, idealDecisions(c)).total).toBe(100);
      // categorias da anamnese continuam agrupadas
      const cats = s1.anamnesis.questions.map((q) => q.category);
      const firstIdx = new Map<string, number>();
      cats.forEach((k, i) => { if (!firstIdx.has(k)) firstIdx.set(k, i); });
      cats.forEach((k, i) => { if (i > 0 && cats[i - 1] !== k) expect(cats.slice(i).includes(cats[i - 1])).toBe(false); });
    });
  }
});
