/**
 * Integridade do conteúdo educacional: casos clínicos, minigames, VetiDex, missões e diálogos.
 */
import { describe, expect, it } from 'vitest';
import { CASES, MINIGAMES, QUESTION_POOLS, REFERENCE_MAP, VETIDEX, VETIDEX_MAP, VETIDEX_CATEGORIES } from '../src/content';
import { QUIZZES } from '../src/content/quizzes';
import { validateCase } from '../src/systems/cases/validateCase';
import { scoreCase } from '../src/systems/cases/scoring';
import type { ClinicalCase } from '../src/systems/cases/caseTypes';
import { idealDecisions } from './helpers';
import { QUESTS, QUEST_MAP, ITEMS } from '../src/content/quests';
import { DIALOGUES } from '../src/content/dialogues';
import { NPCS, ANIMALS } from '../src/content/npcs';
import { MAPS } from '../src/world/maps';
import type { Condition, Effect } from '../src/systems/dialogue/types';

const ctx = {
  referenceIds: new Set(Object.keys(REFERENCE_MAP)),
  vetidexIds: new Set(VETIDEX.map((e) => e.id)),
  textureKeys: new Set(['dog_caramelo', 'dog_campus', 'cat_laranja', 'cat_cinza', 'cow', 'sheep', 'flea']),
};

describe('Casos clínicos', () => {
  for (const c of Object.values(CASES)) {
    describe(c.id, () => {
      it('passa na validação de esquema e integridade', () => {
        expect(validateCase(c, ctx)).toEqual([]);
      });
      it('a solução ideal derivada dos dados obtém 100 pontos', () => {
        const r = scoreCase(c, idealDecisions(c));
        expect(r.total).toBe(100);
        expect(r.passed).toBe(true);
        expect(r.criticalErrors).toEqual([]);
      });
      it('todas as missões referenciadas existem', () => {
        expect(QUEST_MAP[c.missionId]).toBeDefined();
        expect(QUEST_MAP[c.missionId].objectives.some((o) => o.id === 'o_atender')).toBe(true);
      });
      it('existe pelo menos uma conduta crítica ou incorreta com explicação (decisões têm critério)', () => {
        expect(c.conduct.options.some((o) => o.category === 'critical' || o.category === 'incorrect')).toBe(true);
      });
      it('está sinalizado como material educacional pendente de validação', () => {
        expect(c.educationalNotice.toLowerCase()).toContain('educacional');
        expect(['pendente', 'em_revisao', 'validado']).toContain(c.validation.status);
      });
    });
  }

  it('o validador detecta dados incompletos', () => {
    const broken = JSON.parse(JSON.stringify(CASES['caso_thor_prurido'])) as ClinicalCase;
    broken.diagnosis.correctId = 'h_inexistente';
    broken.references = [{ refId: 'inventada2099', supports: 'x' }];
    broken.conduct.options = broken.conduct.options.map((o) => ({ ...o, category: 'acceptable' as const }));
    broken.diagnosis.keyEvidence.push('f_fantasma');
    const errs = validateCase(broken, ctx);
    expect(errs.some((e) => e.includes('correctId'))).toBe(true);
    expect(errs.some((e) => e.includes('referência desconhecida'))).toBe(true);
    expect(errs.some((e) => e.includes('nenhuma conduta correta'))).toBe(true);
    expect(errs.some((e) => e.includes('f_fantasma'))).toBe(true);
  });

  it('o validador detecta ciclos de pré-requisitos na anamnese', () => {
    const broken = JSON.parse(JSON.stringify(CASES['caso_thor_prurido'])) as ClinicalCase;
    broken.anamnesis.questions[0].requires = [broken.anamnesis.questions[1].id];
    broken.anamnesis.questions[1].requires = [broken.anamnesis.questions[0].id];
    expect(validateCase(broken, ctx).some((e) => e.includes('inalcançável'))).toBe(true);
  });
});

describe('Minigame de anatomia', () => {
  const mg = Object.values(MINIGAMES)[0];
  it('banco de estruturas e de perguntas é maior que uma sessão (variedade ao repetir)', () => {
    const ids = new Set(mg.hotspots.structures.map((s) => s.id));
    expect(ids.size).toBe(mg.hotspots.structures.length);
    expect(mg.hotspots.structures.length).toBeGreaterThanOrEqual(mg.hotspots.count * 2);
    const pool = QUESTION_POOLS[mg.quiz.pool];
    expect(pool).toBeDefined();
    expect(pool.questions.length).toBeGreaterThanOrEqual(mg.quiz.count * 3);
    for (const v of mg.vetidexUnlocks) expect(VETIDEX_MAP[v]).toBeDefined();
    for (const r of mg.references) expect(REFERENCE_MAP[r.refId]).toBeDefined();
  });
  it('estruturas não se sobrepõem no esquema (raio de 9 px)', () => {
    const S = mg.hotspots.structures;
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const d = Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y);
      expect(d, `${S[i].id} x ${S[j].id}`).toBeGreaterThanOrEqual(18);
    }
  });
});

describe('Banco de perguntas e quizzes', () => {
  const allIds = new Set<string>();
  it('perguntas completas, ids únicos, referências e VetiDex válidos', () => {
    const caseQ = Object.values(CASES).flatMap((c) => c.review.questions.map((q) => q.id));
    for (const id of caseQ) { expect(allIds.has(id), id).toBe(false); allIds.add(id); }
    for (const pool of Object.values(QUESTION_POOLS)) {
      expect(pool.questions.length, pool.id).toBeGreaterThanOrEqual(12);
      for (const q of pool.questions) {
        expect(allIds.has(q.id), q.id).toBe(false);
        allIds.add(q.id);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(new Set(q.options).size, `${q.id}: opções repetidas`).toBe(q.options.length);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
        expect(q.explanation.length).toBeGreaterThan(15);
        expect(q.refs.length, q.id).toBeGreaterThan(0);
        for (const r of q.refs) expect(REFERENCE_MAP[r], `${q.id}: ${r}`).toBeDefined();
        if (q.vetidexId) expect(VETIDEX_MAP[q.vetidexId], q.id).toBeDefined();
      }
    }
  });
  it('cada caso tem pelo menos 14 perguntas de revisão', () => {
    for (const c of Object.values(CASES)) expect(c.review.questions.length, c.id).toBeGreaterThanOrEqual(14);
  });
  it('quizzes de personagens apontam para pools grandes o suficiente para variar entre tentativas', () => {
    for (const q of Object.values(QUIZZES)) {
      const pool = QUESTION_POOLS[q.pool];
      expect(pool, q.id).toBeDefined();
      expect(q.required).toBeLessThanOrEqual(q.maxQuestions);
      expect(pool.questions.length, q.id).toBeGreaterThanOrEqual(q.maxQuestions * 2);
      expect(NPCS.some((n) => n.id === q.npc)).toBe(true);
    }
  });
});

describe('VetiDex', () => {
  it('entradas completas, categorias e referências válidas', () => {
    const cats = new Set(VETIDEX_CATEGORIES.map((c) => c.id));
    const ids = new Set<string>();
    for (const e of VETIDEX) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(cats.has(e.category)).toBe(true);
      for (const k of ['name', 'summary', 'science', 'didactic', 'professional', 'unlockHint'] as const) expect(e[k].length).toBeGreaterThan(0);
      expect(e.refs.length).toBeGreaterThan(0);
      for (const r of e.refs) expect(REFERENCE_MAP[r]).toBeDefined();
    }
  });
  it('toda entrada pode ser desbloqueada por algum caminho do jogo', () => {
    const unlockable = new Set<string>();
    Object.values(CASES).forEach((c) => c.vetidexUnlocks.forEach((v) => unlockable.add(v)));
    Object.values(MINIGAMES).forEach((m) => m.vetidexUnlocks.forEach((v) => unlockable.add(v)));
    QUESTS.forEach((q) => q.rewards.dex?.forEach((v) => unlockable.add(v)));
    const scanEffects = (effs?: Effect[]) => effs?.forEach((e) => { if (e.type === 'dex') e.ids.forEach((v) => unlockable.add(v)); });
    Object.values(DIALOGUES).forEach((d) => Object.values(d.nodes).forEach((n) => { scanEffects(n.effects); n.choices?.forEach((ch) => scanEffects(ch.effects)); }));
    ANIMALS.forEach((a) => scanEffects(a.interact.effects));
    const missing = VETIDEX.filter((e) => !unlockable.has(e.id)).map((e) => e.id);
    expect(missing).toEqual([]);
  });
});

describe('Missões, diálogos e NPCs', () => {
  const questIds = new Set(QUESTS.map((q) => q.id));
  const checkCond = (c: Condition | undefined, where: string) => {
    if (!c) return;
    for (const k of ['questActive', 'questDone', 'questNotStarted', 'questStarted'] as const) {
      if (c[k]) expect(questIds.has(c[k]!), `${where}: ${c[k]}`).toBe(true);
    }
    for (const k of ['objectiveDone', 'objectiveNotDone'] as const) {
      if (c[k]) {
        const [q, o] = c[k]!;
        expect(QUEST_MAP[q]?.objectives.some((x) => x.id === o), `${where}: ${q}.${o}`).toBe(true);
      }
    }
    c.all?.forEach((x) => checkCond(x, where));
    c.any?.forEach((x) => checkCond(x, where));
  };
  const checkEffects = (effs: Effect[] | undefined, where: string) => {
    effs?.forEach((e) => {
      if (e.type === 'objective') expect(QUEST_MAP[e.quest]?.objectives.some((o) => o.id === e.objective), `${where}: ${e.quest}.${e.objective}`).toBe(true);
      if (e.type === 'startQuest') expect(questIds.has(e.quest), where).toBe(true);
      if (e.type === 'item') expect(ITEMS[e.id], where).toBeDefined();
      if (e.type === 'dex') e.ids.forEach((v) => expect(VETIDEX_MAP[v], `${where}: ${v}`).toBeDefined());
      if (e.type === 'startCase') expect(CASES[e.caseId], where).toBeDefined();
      if (e.type === 'startMinigame') expect(MINIGAMES[e.id], where).toBeDefined();
      if (e.type === 'startQuiz') expect(QUIZZES[e.id], where).toBeDefined();
    });
  };

  it('missões: próximas missões, itens e VetiDex existem', () => {
    for (const q of QUESTS) {
      q.next?.forEach((n) => expect(questIds.has(n)).toBe(true));
      q.rewards.items?.forEach((i) => expect(ITEMS[i]).toBeDefined());
      q.rewards.dex?.forEach((d) => expect(VETIDEX_MAP[d]).toBeDefined());
    }
  });

  it('diálogos: todos os nós referenciados existem e todo nó é alcançável', () => {
    for (const [id, d] of Object.entries(DIALOGUES)) {
      expect(d.entries.length, id).toBeGreaterThan(0);
      expect(d.entries[d.entries.length - 1].when, `${id}: última entrada deve ser incondicional`).toBeUndefined();
      const reach = new Set<string>();
      const stack = d.entries.map((e) => e.start);
      while (stack.length) {
        const n = stack.pop()!;
        expect(d.nodes[n], `${id}: nó inexistente ${n}`).toBeDefined();
        if (reach.has(n)) continue;
        reach.add(n);
        const node = d.nodes[n];
        if (node.next) stack.push(node.next);
        node.choices?.forEach((c) => { if (c.next) stack.push(c.next); });
      }
      for (const n of Object.keys(d.nodes)) expect(reach.has(n), `${id}: nó inalcançável ${n}`).toBe(true);
      d.entries.forEach((e) => checkCond(e.when, id));
      Object.entries(d.nodes).forEach(([nid, node]) => {
        checkEffects(node.effects, `${id}.${nid}`);
        node.choices?.forEach((c) => { checkEffects(c.effects, `${id}.${nid}`); checkCond(c.when, `${id}.${nid}`); });
      });
    }
  });

  it('efeitos dos quizzes são válidos', () => {
    for (const q of Object.values(QUIZZES)) checkEffects(q.onComplete, q.id);
  });

  it('diálogos de quiz sempre oferecem uma resposta correta (o jogador não fica preso)', () => {
    for (const [id, d] of Object.entries(DIALOGUES)) {
      for (const [nid, node] of Object.entries(d.nodes)) {
        if (node.choices?.some((c) => c.correct !== undefined)) {
          expect(node.choices.some((c) => c.correct === true), `${id}.${nid}`).toBe(true);
        }
      }
    }
  });

  it('NPCs e animais apontam para diálogos e mapas existentes', () => {
    for (const n of NPCS) {
      expect(DIALOGUES[n.dialogue], n.id).toBeDefined();
      expect(MAPS[n.map], n.id).toBeDefined();
      checkCond(n.visibleWhen, n.id);
    }
    for (const a of ANIMALS) {
      if (a.interact.dialogue) expect(DIALOGUES[a.interact.dialogue], a.id).toBeDefined();
      expect(MAPS[a.map], a.id).toBeDefined();
      expect(ctx.textureKeys.has(a.sprite), a.id).toBe(true);
    }
  });

  it('a cadeia de missões principais é completável a partir do início', () => {
    // Cada missão principal (exceto a primeira) deve ser iniciada por outra missão ou por um efeito de diálogo.
    const started = new Set<string>(['q_boas_vindas']);
    QUESTS.forEach((q) => q.next?.forEach((n) => started.add(n)));
    Object.values(DIALOGUES).forEach((d) => Object.values(d.nodes).forEach((n) => [...(n.effects ?? []), ...(n.choices?.flatMap((c) => c.effects ?? []) ?? [])].forEach((e) => { if (e.type === 'startQuest') started.add(e.quest); })));
    for (const q of QUESTS) expect(started.has(q.id), q.id).toBe(true);
    // Cada objetivo deve ser concluível por algum efeito, caso, minigame ou regra dinâmica.
    const completable = new Set<string>();
    Object.values(DIALOGUES).forEach((d) => Object.values(d.nodes).forEach((n) => [...(n.effects ?? []), ...(n.choices?.flatMap((c) => c.effects ?? []) ?? [])].forEach((e) => { if (e.type === 'objective') completable.add(`${e.quest}.${e.objective}`); })));
    Object.values(CASES).forEach((c) => completable.add(`${c.missionId}.o_atender`));
    Object.values(QUIZZES).forEach((q) => q.onComplete.forEach((e) => { if (e.type === 'objective') completable.add(`${e.quest}.${e.objective}`); }));
    Object.values(MINIGAMES).forEach((m) => completable.add(`${m.missionId}.o_aula`));
    ['q_proxima_etapa.o_nivel', 'q_proxima_etapa.o_revisao', 'q_boas_vindas.o_lab', 'q_biosseguranca.o_hospital'].forEach((k) => completable.add(k));
    for (const q of QUESTS) for (const o of q.objectives) expect(completable.has(`${q.id}.${o.id}`), `${q.id}.${o.id}`).toBe(true);
  });
});
