/** Tela simples de estatísticas do aluno, com exportação (planilha CSV, texto, cópia e impressão/PDF). */
import { app, requireState } from '../core/context';
import { DISCIPLINES } from '../content/disciplines';
import { QUESTS } from '../content/quests';
import { VETIDEX } from '../content';
import { buildReport, reportToCsv, reportToText } from '../systems/report/report';
import { h } from './dom';
import { ui } from './UIManager';

function download(name: string, content: string, type: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = h('a', { href: url, download: name, style: 'display:none' }) as HTMLAnchorElement;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch { return false; }
}

async function copy(text: string, area: HTMLTextAreaElement): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* segue para o modo manual */ }
  area.hidden = false; area.focus(); area.select();
  try { return document.execCommand('copy'); } catch { return false; }
}

export function openReport(): void {
  const st = requireState();
  const r = buildReport(st.data, { disciplines: DISCIPLINES, quests: QUESTS, vetidexTotal: VETIDEX.length });
  const text = reportToText(r);
  const slug = r.student.normalize('NFD').replace(/[^\w]+/g, '_').replace(/_+$/, '') || 'aluno';
  const stamp = new Date().toISOString().slice(0, 10);
  const status = h('p', { class: 'small muted', role: 'status' });
  const area = h('textarea', { class: 'report-text', readonly: true, hidden: true, 'aria-label': 'Resumo do relatório' }) as HTMLTextAreaElement;
  area.value = text;
  const opt = (v: number | null, suf = '') => (v === null ? '—' : `${v}${suf}`);
  const stat = (n: string, label: string) => h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, n), h('div', { class: 'stat-label' }, label));
  const bar = (label: string, p: number | null) => h('div', { class: 'report-bar' },
    h('span', null, label), h('div', { class: 'report-track' }, h('div', { class: 'report-fill', style: `width:${p ?? 0}%` })), h('strong', null, opt(p, '%')));

  const el = h('div', { class: 'overlay' }, h('div', { class: 'review panel report', role: 'dialog', 'aria-label': 'Relatório de desempenho' },
    h('h2', null, '📊 Relatório de desempenho'),
    h('p', { class: 'muted small' }, `${r.student} • ${r.stage} • gerado em ${r.generatedAt}`),
    h('div', { class: 'stat-row' },
      stat(String(r.level), 'Nível'), stat(String(r.attendances), 'Atendimentos'), stat(opt(r.average), 'Média'),
      stat(opt(r.quizzes.correctPct, '%'), 'Acertos em perguntas'), stat(`${r.questsDone}/${r.questsTotal}`, 'Missões'), stat(`Dia ${r.day}`, 'No jogo'),
    ),
    h('h3', null, 'Aproveitamento por etapa do atendimento'),
    ...r.sections.map((s) => bar(s.label, s.pct)),
    h('h3', null, 'Domínio por disciplina'),
    h('table', { class: 'report-table' },
      h('thead', null, h('tr', null, h('th', null, 'Disciplina'), h('th', null, 'Nível'), h('th', null, 'XP'))),
      h('tbody', null, ...r.disciplines.map((x) => h('tr', null, h('td', null, x.name), h('td', null, x.level), h('td', null, String(x.xp)))))),
    h('h3', null, `Histórico (${r.cases.length})`),
    r.cases.length
      ? h('table', { class: 'report-table' },
        h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Atividade'), h('th', null, 'Nota'))),
        h('tbody', null, ...r.cases.slice().reverse().map((c) => h('tr', null, h('td', null, c.date), h('td', null, c.title + (c.critical ? ' ⚠' : '')), h('td', null, String(c.total))))))
      : h('p', { class: 'muted small' }, 'Nenhuma atividade registrada ainda.'),
    h('p', { class: 'small muted' }, `Tempo de jogo: ${r.playTime} • VetiDex: ${r.vetidex.unlocked}/${r.vetidex.total} • Decisões críticas: ${r.criticalErrors} • Revisões pendentes: ${r.review.pending}`),
    h('div', { class: 'report-actions' },
      h('button', { class: 'btn btn-primary', onclick: () => { const ok = download(`aurora-vet_${slug}_${stamp}.csv`, reportToCsv(r), 'text/csv;charset=utf-8'); status.textContent = ok ? 'Planilha baixada (abre no Excel, LibreOffice ou Google Planilhas).' : 'Não foi possível baixar aqui. Use “Copiar resumo”.'; app.audio.sfx('confirm'); } }, '⬇ Baixar planilha (CSV)'),
      h('button', { class: 'btn', onclick: () => { const ok = download(`aurora-vet_${slug}_${stamp}.txt`, text, 'text/plain;charset=utf-8'); status.textContent = ok ? 'Resumo em texto baixado.' : 'Não foi possível baixar aqui. Use “Copiar resumo”.'; app.audio.sfx('confirm'); } }, '⬇ Baixar resumo (TXT)'),
      h('button', { class: 'btn', onclick: async () => { const ok = await copy(text, area); status.textContent = ok ? 'Resumo copiado! Cole no e-mail ou na mensagem para o professor.' : 'Selecione o texto abaixo e copie manualmente.'; app.audio.sfx('confirm'); } }, '📋 Copiar resumo'),
      h('button', { class: 'btn', onclick: () => { document.body.classList.add('printing-report'); try { window.print(); } finally { setTimeout(() => document.body.classList.remove('printing-report'), 500); } } }, '🖨 Imprimir / salvar PDF'),
    ),
    status,
    area,
    h('div', { class: 'menu-footer report-actions' }, h('button', { class: 'btn', onclick: () => ui().close(m) }, 'Fechar')),
  ));
  const m = ui().open({ el });
}
