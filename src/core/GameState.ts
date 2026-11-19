/**
 * Estado central do jogo: jogador, missões, XP, VetiDex, inventário, domínio por disciplina,
 * histórico acadêmico e revisão espaçada. Independente do Phaser (pode ser testado em Node).
 */
import { genderize } from './genderize';
import { bus, Events } from './EventBus';
import type { Appearance, CaseRecord, PetRecord, QuestProgress, SaveData } from './types';
import { BREED_MAP, MAX_PETS } from '../content/pets';
import { dueItems, scoreCheckup, type CheckupResult } from '../systems/pets/health';
import type { CareItem } from '../content/petHealth';
import { SaveManager, SAVE_VERSION } from './SaveManager';
import { QUEST_MAP, ITEMS } from '../content/quests';
import type { Condition, Effect } from '../systems/dialogue/types';
import { levelFromXp, caseXp } from '../systems/progression/xp';
import { scheduleReview, answerReview } from '../systems/review/spacedReview';
import { recordAnswer } from '../systems/questions/bank';
import type { ClinicalCase, ScoreReport } from '../systems/cases/caseTypes';
import { masteryGains } from '../systems/cases/scoring';
import vetidexData from '../content/vetidex.json';
import { CASES } from '../content';
import { advancePeriod, newCalendar, nextDay, periodLabel, type CalendarState, type DailyCase, type DailyPatient, type DayReport } from '../systems/days/calendar';

const DEX_NAMES: Record<string, string> = Object.fromEntries(vetidexData.entries.map((e) => [e.id, e.name]));

export function newSaveData(name: string, appearance: Appearance, now = Date.now()): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    player: { name, appearance, mapId: 'campus', x: 21, y: 29, facing: 'up' },
    totalXp: 0,
    flags: {},
    quests: {},
    inventory: { cracha: 1 },
    vetidex: { unlocked: [], seen: [] },
    disciplines: {},
    caseHistory: [],
    reviewItems: [],
    questionStats: {},
    pets: { owned: [], companion: null },
    stats: { playTimeSec: 0, steps: 0, casesCompleted: 0 },
    calendar: newCalendar(),
  };
}

export class GameState {
  data: SaveData;
  private onceKeys = new Set<string>();

  constructor(data: SaveData, private saver?: SaveManager) {
    this.data = data;
  }

  // ------------------------------------------------------------ util
  get level(): number { return levelFromXp(this.data.totalXp); }
  interpolate(text: string): string {
    return genderize(text.replace(/\{nome\}/g, this.data.player.name), this.data.player.appearance.sex);
  }

  save(): void {
    if (this.saver?.save(this.data)) bus.emit(Events.Saved);
  }

  // ------------------------------------------------------------ condições
  questStatus(id: string): QuestProgress | undefined { return this.data.quests[id]; }

  check(c?: Condition): boolean {
    if (!c) return true;
    const q = this.data.quests;
    if (c.flag !== undefined && !this.data.flags[c.flag]) return false;
    if (c.notFlag !== undefined && this.data.flags[c.notFlag]) return false;
    if (c.questActive && q[c.questActive]?.status !== 'active') return false;
    if (c.questDone && q[c.questDone]?.status !== 'completed') return false;
    if (c.questNotStarted && q[c.questNotStarted]) return false;
    if (c.questStarted && !q[c.questStarted]) return false;
    if (c.objectiveDone && !q[c.objectiveDone[0]]?.objectives[c.objectiveDone[1]]) return false;
    if (c.objectiveNotDone) {
      const qp = q[c.objectiveNotDone[0]];
      if (!qp || qp.objectives[c.objectiveNotDone[1]]) return false;
    }
    if (c.minLevel !== undefined && this.level < c.minLevel) return false;
    if (c.casePassed && !this.hasPassedCase(c.casePassed)) return false;
    if (c.caseNotPassed && this.hasPassedCase(c.caseNotPassed)) return false;
    if (c.hasItem && !this.data.inventory[c.hasItem]) return false;
    if (c.hasPet !== undefined && (this.data.pets.owned.length > 0) !== c.hasPet) return false;
    if (c.patientPresent && this.calendar.storyDischarged.includes(c.patientPresent)) return false;
    if (c.all && !c.all.every((x) => this.check(x))) return false;
    if (c.any && !c.any.some((x) => this.check(x))) return false;
    return true;
  }

  // ------------------------------------------------------------ efeitos
  /**
   * Aplica efeitos. Efeitos de XP/domínio vindos de diálogos são concedidos uma única vez por `onceKey`.
   * Efeitos que abrem interfaces (casos, minigames, painéis) são emitidos como eventos para a UI.
   */
  apply(effects: Effect[] | undefined, onceKey?: string): void {
    if (!effects) return;
    for (const e of effects) {
      switch (e.type) {
        case 'flag': this.setFlag(e.key, e.value ?? true); break;
        case 'objective': this.completeObjective(e.quest, e.objective); break;
        case 'startQuest': this.startQuest(e.quest); break;
        case 'xp': if (this.once(onceKey, 'xp')) this.addXp(e.amount, e.reason); break;
        case 'item': this.giveItem(e.id, e.qty ?? 1); break;
        case 'dex': this.unlockDex(e.ids); break;
        case 'mastery': if (this.once(onceKey, `m:${e.discipline}.${e.skill}`)) this.addMastery(e.discipline, e.skill, e.xp); break;
        case 'startCase': bus.emit('ui:startCase', { id: e.caseId, patient: e.patient }); break;
        case 'sleep': bus.emit('ui:sleep'); break;
        case 'startMinigame': bus.emit('ui:startMinigame', e.id); break;
        case 'startQuiz': bus.emit('ui:startQuiz', e.id); break;
        case 'adoptPet': bus.emit('ui:adoptPet'); break;
        case 'petCheckup': bus.emit('ui:petCheckup'); break;
        case 'openReview': bus.emit('ui:openReview'); break;
        case 'openLesson': bus.emit('ui:openLesson', e.id); break;
        case 'openPanel': bus.emit('ui:openPanel', e.panel); break;
        case 'save': this.save(); break;
      }
    }
  }

  private once(onceKey: string | undefined, suffix: string): boolean {
    if (!onceKey) return true;
    const k = `once:${onceKey}:${suffix}`;
    if (this.data.flags[k] || this.onceKeys.has(k)) return false;
    this.data.flags[k] = true;
    this.onceKeys.add(k);
    return true;
  }

  setFlag(key: string, value: boolean | number | string = true): void {
    this.data.flags[key] = value;
    bus.emit(Events.StateChanged);
  }

  // ------------------------------------------------------------ XP
  addXp(amount: number, reason: string): void {
    if (amount <= 0) return;
    const before = this.level;
    this.data.totalXp += amount;
    bus.emit(Events.XpGained, { amount, reason });
    const after = this.level;
    if (after > before) bus.emit(Events.LevelUp, { level: after });
    this.checkDynamicObjectives();
    bus.emit(Events.StateChanged);
  }

  addMastery(discipline: string, skill: string, xp: number): void {
    if (xp <= 0) return;
    const d = (this.data.disciplines[discipline] ??= {});
    d[skill] = (d[skill] ?? 0) + xp;
    bus.emit(Events.StateChanged);
  }

  // ------------------------------------------------------------ itens e VetiDex
  giveItem(id: string, qty = 1): void {
    const had = this.data.inventory[id] ?? 0;
    this.data.inventory[id] = had + qty;
    if (had === 0) bus.emit(Events.ItemGained, { id, name: ITEMS[id]?.name ?? id });
    bus.emit(Events.StateChanged);
  }

  unlockDex(ids: string[]): string[] {
    const fresh = ids.filter((id) => !this.data.vetidex.unlocked.includes(id));
    if (!fresh.length) return [];
    this.data.vetidex.unlocked.push(...fresh);
    bus.emit(Events.DexUnlocked, { ids: fresh, names: fresh.map((id) => DEX_NAMES[id] ?? id) });
    bus.emit(Events.StateChanged);
    return fresh;
  }

  markDexSeen(id: string): void {
    if (!this.data.vetidex.seen.includes(id)) this.data.vetidex.seen.push(id);
  }

  // ------------------------------------------------------------ missões
  startQuest(id: string): void {
    const def = QUEST_MAP[id];
    if (!def || this.data.quests[id]) return;
    this.data.quests[id] = { status: 'active', objectives: Object.fromEntries(def.objectives.map((o) => [o.id, false])), startedAt: Date.now() };
    bus.emit(Events.QuestUpdated, { id, started: true, title: def.title });
    this.checkDynamicObjectives();
    bus.emit(Events.StateChanged);
  }

  completeObjective(questId: string, objectiveId: string): void {
    const qp = this.data.quests[questId];
    if (!qp || qp.status !== 'active' || qp.objectives[objectiveId] === undefined || qp.objectives[objectiveId]) return;
    qp.objectives[objectiveId] = true;
    const def = QUEST_MAP[questId];
    const obj = def.objectives.find((o) => o.id === objectiveId);
    bus.emit(Events.QuestUpdated, { id: questId, objective: obj?.text });
    if (Object.values(qp.objectives).every(Boolean)) this.completeQuest(questId);
    bus.emit(Events.StateChanged);
    this.save();
  }

  private completeQuest(id: string): void {
    const qp = this.data.quests[id];
    const def = QUEST_MAP[id];
    if (!qp || qp.status === 'completed') return;
    qp.status = 'completed';
    qp.completedAt = Date.now();
    bus.emit(Events.QuestCompleted, { id, title: def.title });
    def.rewards.items?.forEach((i) => this.giveItem(i));
    if (def.rewards.dex) this.unlockDex(def.rewards.dex);
    def.rewards.flags?.forEach((f) => this.setFlag(f));
    if (def.rewards.xp) this.addXp(def.rewards.xp, `Missão: ${def.title}`);
    def.next?.forEach((n) => this.startQuest(n));
  }

  /**
   * Garante que missões adicionadas em atualizações sejam iniciadas em saves antigos:
   * para cada missão concluída, inicia as próximas que ainda não começaram.
   */
  ensureQuestChain(): void {
    // saves anteriores à Etapa 2: quem já concluiu "Rumo à Etapa 2" recebe a liberação da Vila
    if (this.data.quests['q_proxima_etapa']?.status === 'completed' && !this.data.flags['etapa2_liberada']) this.setFlag('etapa2_liberada');
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, qp] of Object.entries(this.data.quests)) {
        if (qp.status !== 'completed') continue;
        for (const n of QUEST_MAP[id]?.next ?? []) if (!this.data.quests[n]) { this.startQuest(n); changed = true; }
      }
    }
  }

  /** Objetivos que dependem de estado (nível, contagem de revisões). */
  checkDynamicObjectives(): void {
    const q = this.data.quests['q_proxima_etapa'];
    if (q?.status === 'active') {
      if (!q.objectives['o_nivel'] && this.level >= 5) this.completeObjective('q_proxima_etapa', 'o_nivel');
      if (!q.objectives['o_revisao'] && Number(this.data.flags['revisoes_respondidas'] ?? 0) >= 3) this.completeObjective('q_proxima_etapa', 'o_revisao');
    }
  }

  activeObjectiveText(): string | null {
    // missão principal ativa tem prioridade
    const active = Object.entries(this.data.quests).filter(([, p]) => p.status === 'active');
    active.sort(([a], [b]) => (QUEST_MAP[a].category === 'principal' ? 0 : 1) - (QUEST_MAP[b].category === 'principal' ? 0 : 1));
    for (const [id, p] of active) {
      const def = QUEST_MAP[id];
      const next = def.objectives.find((o) => !p.objectives[o.id]);
      if (next) return next.text;
    }
    return null;
  }

  // ------------------------------------------------------------ pets
  /** Adota um pet; retorna o registro ou null se o limite foi atingido. */
  adoptPet(breedId: string, name: string, now = Date.now()): PetRecord | null {
    const breed = BREED_MAP[breedId];
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 14);
    if (!breed || !clean || this.data.pets.owned.length >= MAX_PETS) return null;
    const rec: PetRecord = { id: `pet_${now.toString(36)}_${this.data.pets.owned.length}`, species: breed.species, breed: breed.id, name: clean, adoptedAt: now, affection: 0 };
    this.data.pets.owned.push(rec);
    if (!this.data.pets.companion) this.data.pets.companion = rec.id;
    bus.emit(Events.Toast, { text: `${clean} agora faz parte da sua vida! Adoção é um compromisso para sempre.`, kind: 'level', icon: '🐾' });
    bus.emit('pets:changed');
    this.save();
    return rec;
  }

  setCompanion(id: string | null): void {
    if (id && !this.data.pets.owned.some((p) => p.id === id)) return;
    this.data.pets.companion = id;
    bus.emit('pets:changed');
    this.save();
  }

  companion(): PetRecord | null {
    return this.data.pets.owned.find((p) => p.id === this.data.pets.companion) ?? null;
  }

  /** Pendências de saúde do pet (cuidados vencidos ou nunca feitos). */
  petDue(id: string, now = Date.now()): CareItem[] {
    const p = this.data.pets.owned.find((x) => x.id === id);
    const b = p && BREED_MAP[p.breed];
    return p && b ? dueItems(b.look.kind, p.health, now) : [];
  }

  /** Registra a consulta preventiva: marca cuidados feitos, concede XP e domínio quando há pendências. */
  completeCheckup(id: string, chosen: string[], breedCorrect: boolean, now = Date.now()): CheckupResult & { xp: number } {
    const p = this.data.pets.owned.find((x) => x.id === id)!;
    const kind = BREED_MAP[p.breed].look.kind;
    const r = scoreCheckup(kind, p.health, chosen, breedCorrect, now);
    let xp = 0;
    if (r.critical.length === 0) {
      p.health = { ...(p.health ?? {}) };
      for (const item of r.done) p.health[item] = now;
      if (r.done.length) {
        xp = Math.round((20 + 5 * r.done.length) * (r.score / 100));
        this.addMastery('clinica', 'condutas', Math.round(10 * r.score / 100));
        this.addMastery('saude_publica', 'saude_unica', Math.round(8 * r.score / 100));
        this.addXp(xp, `Consulta preventiva: ${p.name}`);
      }
      if (r.passed) { p.affection = Math.min(10, p.affection + 2); }
    }
    bus.emit('pets:changed');
    this.save();
    return { ...r, xp };
  }

  petAffection(id: string): number {
    const p = this.data.pets.owned.find((x) => x.id === id);
    if (!p) return 0;
    p.affection = Math.min(10, p.affection + 1);
    return p.affection;
  }

  // ------------------------------------------------------------ casos e histórico
  hasPassedCase(caseId: string): boolean {
    return this.data.caseHistory.some((r) => r.caseId === caseId && r.total >= 60 && r.criticalErrors.length === 0);
  }

  attemptsOf(caseId: string): number {
    return this.data.caseHistory.filter((r) => r.caseId === caseId).length;
  }

  /** Registra um atendimento clínico concluído e aplica XP, domínio, revisão e missões. */
  recordClinicalCase(c: ClinicalCase, report: ScoreReport): { xp: number; record: CaseRecord } {
    const daily = (c as Partial<DailyCase>).dailyUid ? this.dailyPatient((c as DailyCase).dailyUid) : undefined;
    const alreadyPassed = this.hasPassedCase(c.id);
    const attempt = this.attemptsOf(c.id) + 1;
    // pacientes do dia são pacientes novos: metade do XP de uma primeira tentativa
    const xp = daily
      ? Math.round(caseXp(c.baseXp, report.total, { attempt: 1, alreadyPassed: false, passScore: c.passScore }) * 0.5)
      : caseXp(c.baseXp, report.total, { attempt, alreadyPassed, passScore: c.passScore });
    const factor = daily ? 0.5 : alreadyPassed ? 0.25 : attempt <= 1 ? 1 : 0.5;
    if (daily && report.passed) { daily.status = 'treated'; daily.score = report.total; }
    const wasNight = this.calendar.period === 2;
    this.data.calendar = advancePeriod(this.calendar); // cada atendimento consome um período do dia
    if (!wasNight && this.calendar.period === 2) bus.emit(Events.Toast, { text: 'Anoiteceu! Quando quiser, volte para casa e durma: amanhã chegam novos pacientes.', icon: '🌙' });
    for (const g of masteryGains(c, report, factor)) this.addMastery(g.discipline, g.skill, g.xp);

    const record: CaseRecord = {
      caseId: c.id,
      title: c.title,
      kind: 'clinical',
      date: Date.now(),
      attempt,
      total: report.total,
      sections: Object.fromEntries(report.sections.map((s) => [s.id, s.score])),
      sectionMax: Object.fromEntries(report.sections.map((s) => [s.id, s.max])),
      criticalErrors: report.criticalErrors,
      reviewTopics: report.reviewTopics.map((t) => t.title),
      xpGained: xp,
      disciplines: Array.from(new Set(c.disciplines.map((d) => d.discipline))),
    };
    this.data.caseHistory.push(record);
    this.data.stats.casesCompleted++;

    const now = Date.now();
    for (const qid of report.triggeredReviewQuestions) this.data.reviewItems = scheduleReview(this.data.reviewItems, qid, c.id, now);

    this.unlockDex(c.vetidexUnlocks);
    this.addXp(xp, `Atendimento: ${c.patient.name}`);
    if (report.passed) this.completeObjective(c.missionId, 'o_atender');
    this.save();
    return { xp, record };
  }

  // ------------------------------------------------------------ dias e pacientes do dia
  get calendar(): CalendarState {
    if (!this.data.calendar) this.data.calendar = newCalendar();
    return this.data.calendar;
  }
  get storyStage(): number { return this.data.flags['etapa2_liberada'] ? 2 : 1; }
  dayLabel(): string { return periodLabel(this.calendar); }
  dailyPatient(uid: string): DailyPatient | undefined { return this.calendar.patients.find((p) => p.uid === uid); }

  /** Dorme até a manhã seguinte: altas, novos pacientes e salvamento. */
  sleep(rnd: () => number = Math.random): DayReport {
    const passed = (id: string) => this.hasPassedCase(id);
    const all = Object.values(CASES);
    const ctx = {
      pool: all.filter((c) => passed(c.id) && c.minStage <= this.storyStage),
      storyStage: this.storyStage,
      passedStoryCases: all.filter((c) => c.missionId && passed(c.id)).map((c) => c.id),
    };
    const { cal, report } = nextDay(this.calendar, ctx, rnd);
    this.data.calendar = cal;
    // nomes legíveis para as altas dos pacientes da história
    report.discharged = report.discharged.map((d) => (d.where === 'story' ? { ...d, name: CASES[d.name]?.patient.name ?? d.name } : d));
    bus.emit(Events.StateChanged);
    this.save();
    return report;
  }

  recordMinigame(params: { id: string; title: string; missionId: string; total: number; passScore: number; baseXp: number; sections: Record<string, number>; disciplines: { discipline: string; skill: string; pct: number }[]; dex: string[] }): { xp: number } {
    const prev = this.data.caseHistory.filter((r) => r.caseId === params.id);
    const alreadyPassed = prev.some((r) => r.total >= params.passScore);
    const attempt = prev.length + 1;
    const xp = caseXp(params.baseXp, params.total, { attempt, alreadyPassed, passScore: params.passScore });
    const factor = alreadyPassed ? 0.25 : attempt <= 1 ? 1 : 0.5;
    for (const d of params.disciplines) this.addMastery(d.discipline, d.skill, Math.round(40 * (d.pct / 100) * factor));
    this.data.caseHistory.push({
      caseId: params.id, title: params.title, kind: 'minigame', date: Date.now(), attempt, total: params.total,
      sections: params.sections, sectionMax: Object.fromEntries(Object.keys(params.sections).map((k) => [k, 100])),
      criticalErrors: [], reviewTopics: [], xpGained: xp, disciplines: Array.from(new Set(params.disciplines.map((d) => d.discipline))),
    });
    if (params.total >= params.passScore) this.unlockDex(params.dex);
    this.addXp(xp, params.title);
    if (params.total >= params.passScore) this.completeObjective(params.missionId, 'o_aula');
    this.save();
    return { xp };
  }

  /** Agenda na revisão espaçada uma pergunta do banco respondida incorretamente. */
  scheduleBankReview(questionId: string, source: string): void {
    this.data.reviewItems = scheduleReview(this.data.reviewItems, questionId, source, Date.now());
  }

  /** Registra a resposta a uma pergunta do banco (usado no sorteio de perguntas inéditas). */
  recordQuestion(key: string, correct: boolean): void {
    this.data.questionStats = recordAnswer(this.data.questionStats, key, correct, Date.now());
  }

  answerReviewItem(questionId: string, correct: boolean): void {
    this.recordQuestion(questionId, correct);
    this.data.reviewItems = answerReview(this.data.reviewItems, questionId, correct, Date.now());
    this.data.flags['revisoes_respondidas'] = Number(this.data.flags['revisoes_respondidas'] ?? 0) + 1;
    if (correct) this.addXp(10, 'Revisão espaçada');
    this.checkDynamicObjectives();
    this.save();
  }
}
