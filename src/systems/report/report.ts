/**
 * Relatório de desempenho do aluno, para exportar (CSV para planilhas e texto para enviar ao professor).
 * Função pura: recebe o save e os catálogos e devolve os números e os arquivos prontos.
 */
import type { SaveData } from '../../core/types';
import { SECTION_LABELS, SECTION_ORDER, type SectionId } from '../cases/caseTypes';
import { levelFromXp, stageFor, masteryTier } from '../progression/xp';

export interface ReportCatalog {
  disciplines: { id: string; name: string; skills: { id: string; name: string }[] }[];
  quests: { id: string; title: string; category: string }[];
  vetidexTotal: number;
}

export interface StudentReport {
  generatedAt: string;
  student: string;
  level: number;
  stage: string;
  xp: number;
  day: number;
  playTime: string;
  attendances: number;
  approved: number;
  average: number | null;
  best: number | null;
  criticalErrors: number;
  sections: { id: SectionId; label: string; pct: number | null }[];
  disciplines: { name: string; xp: number; level: string }[];
  quizzes: { answered: number; correctPct: number | null };
  questsDone: number;
  questsTotal: number;
  vetidex: { unlocked: number; total: number };
  review: { pending: number; total: number };
  cases: { date: string; title: string; total: number; attempt: number; critical: number; kind: string }[];
}

const pct = (v: number) => Math.round(v * 100);
const fmtDate = (t: number) => new Date(t).toLocaleDateString('pt-BR');

export function buildReport(d: SaveData, cat: ReportCatalog, now = Date.now()): StudentReport {
  const clinical = d.caseHistory.filter((r) => r.kind === 'clinical');
  const totals = clinical.map((r) => r.total);
  const level = levelFromXp(d.totalXp);
  const stage = stageFor(level, d.flags['etapa2_liberada'] ? 2 : 1);
  const qs = Object.values(d.questionStats ?? {});
  const answered = qs.reduce((a, q) => a + q.seen, 0);
  const correct = qs.reduce((a, q) => a + q.correct, 0);
  const secs = d.stats.playTimeSec;
  return {
    generatedAt: new Date(now).toLocaleString('pt-BR'),
    student: d.player.name,
    level,
    stage: `Etapa ${stage.id}: ${stage.title}`,
    xp: d.totalXp,
    day: d.calendar?.day ?? 1,
    playTime: `${Math.floor(secs / 3600)} h ${Math.floor((secs % 3600) / 60)} min`,
    attendances: clinical.length,
    approved: clinical.filter((r) => r.total >= 60 && r.criticalErrors.length === 0).length,
    average: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
    best: totals.length ? Math.max(...totals) : null,
    criticalErrors: clinical.reduce((a, r) => a + r.criticalErrors.length, 0),
    sections: SECTION_ORDER.map((s) => {
      const vals = clinical.map((r) => (r.sections[s] ?? 0) / (r.sectionMax[s] || 20));
      return { id: s, label: SECTION_LABELS[s], pct: vals.length ? pct(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
    }),
    disciplines: cat.disciplines.map((disc) => {
      const xp = Object.values(d.disciplines[disc.id] ?? {}).reduce((a, b) => a + b, 0);
      return { name: disc.name, xp, level: masteryTier(xp).name };
    }),
    quizzes: { answered, correctPct: answered ? pct(correct / answered) : null },
    questsDone: Object.values(d.quests).filter((q) => q.status === 'completed').length,
    questsTotal: cat.quests.length,
    vetidex: { unlocked: d.vetidex.unlocked.length, total: cat.vetidexTotal },
    review: { pending: d.reviewItems.filter((r) => r.due <= now).length, total: d.reviewItems.length },
    cases: d.caseHistory.map((r) => ({ date: fmtDate(r.date), title: r.title, total: r.total, attempt: r.attempt, critical: r.criticalErrors.length, kind: r.kind === 'clinical' ? 'Atendimento' : 'Atividade' })),
  };
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV com separador ";" (abre direto no Excel/LibreOffice em português). */
export function reportToCsv(r: StudentReport): string {
  const lines: (string | number | null)[][] = [
    ['Aurora Vet — Relatório de desempenho'],
    ['Aluno(a)', r.student], ['Gerado em', r.generatedAt], ['Nível', r.level], ['Etapa', r.stage], ['XP total', r.xp],
    ['Dia no jogo', r.day], ['Tempo de jogo', r.playTime],
    ['Atendimentos', r.attendances], ['Aprovados', r.approved], ['Média (0-100)', r.average], ['Melhor nota', r.best], ['Decisões críticas', r.criticalErrors],
    ['Perguntas respondidas', r.quizzes.answered], ['Acertos nas perguntas (%)', r.quizzes.correctPct],
    ['Missões concluídas', `${r.questsDone}/${r.questsTotal}`], ['VetiDex', `${r.vetidex.unlocked}/${r.vetidex.total}`],
    ['Revisões pendentes', r.review.pending],
    [],
    ['Etapa do atendimento', 'Aproveitamento médio (%)'],
    ...r.sections.map((s) => [s.label, s.pct]),
    [],
    ['Disciplina', 'XP de domínio', 'Nível de domínio'],
    ...r.disciplines.map((x) => [x.name, x.xp, x.level]),
    [],
    ['Data', 'Tipo', 'Atividade', 'Nota', 'Tentativa', 'Decisões críticas'],
    ...r.cases.map((c) => [c.date, c.kind, c.title, c.total, c.attempt, c.critical]),
  ];
  return '﻿' + lines.map((l) => l.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

/** Resumo em texto simples (para copiar e colar em e-mail ou mensagem ao professor). */
export function reportToText(r: StudentReport): string {
  const opt = (v: number | null, suf = '') => (v === null ? '—' : `${v}${suf}`);
  return [
    `Aurora Vet — Relatório de desempenho`,
    `Aluno(a): ${r.student} • Gerado em ${r.generatedAt}`,
    `${r.stage} • Nível ${r.level} • ${r.xp} XP • Dia ${r.day} no jogo • ${r.playTime} de jogo`,
    ``,
    `ATENDIMENTOS: ${r.attendances} (aprovados: ${r.approved}) • média ${opt(r.average)} • melhor nota ${opt(r.best)} • decisões críticas: ${r.criticalErrors}`,
    `PERGUNTAS: ${r.quizzes.answered} respondidas • ${opt(r.quizzes.correctPct, '%')} de acertos`,
    `MISSÕES: ${r.questsDone}/${r.questsTotal} • VETIDEX: ${r.vetidex.unlocked}/${r.vetidex.total} • REVISÕES PENDENTES: ${r.review.pending}`,
    ``,
    `APROVEITAMENTO POR ETAPA DO ATENDIMENTO`,
    ...r.sections.map((s) => `- ${s.label}: ${opt(s.pct, '%')}`),
    ``,
    `DOMÍNIO POR DISCIPLINA`,
    ...r.disciplines.map((x) => `- ${x.name}: ${x.level} (${x.xp} XP)`),
    ``,
    `HISTÓRICO`,
    ...(r.cases.length ? r.cases.map((c) => `- ${c.date} • ${c.title} • nota ${c.total} • tentativa ${c.attempt}${c.critical ? ` • ${c.critical} decisão(ões) crítica(s)` : ''}`) : ['- (nenhuma atividade registrada)']),
  ].join('\n');
}
