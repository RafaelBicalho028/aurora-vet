/**
 * Sessão de revisão espaçada: perguntas sobre erros cometidos em atendimentos anteriores.
 */
import { app, requireState } from '../core/context';
import { BANK_QUESTIONS, CASES, QUESTION_POOLS } from '../content';
import type { ReviewQuestion } from '../systems/cases/caseTypes';
import { dueReviews, scheduleReview } from '../systems/review/spacedReview';
import { pickQuestions, shuffleOptions } from '../systems/questions/bank';
import { h, clear } from './dom';
import { ui } from './UIManager';

export function allReviewQuestions(): Record<string, ReviewQuestion & { caseTitle: string }> {
  const out: Record<string, ReviewQuestion & { caseTitle: string }> = {};
  for (const c of Object.values(CASES)) for (const q of c.review.questions) out[q.id] = { ...q, caseTitle: `caso ${c.patient.name}` };
  for (const q of Object.values(BANK_QUESTIONS)) out[q.id] = { ...q, topic: QUESTION_POOLS[q.pool].title, triggeredBy: [], caseTitle: 'banco de perguntas' };
  return out;
}

export function openReview(): void {
  const st = requireState();
  const bank = allReviewQuestions();
  let queue = dueReviews(st.data.reviewItems, Date.now()).filter((i) => bank[i.id]).slice(0, 5);
  let practice = false;
  if (!queue.length) {
    // Sem pendências: modo prática com perguntas dos casos já concluídos que ainda não estão no sistema.
    const done = new Set(st.data.caseHistory.filter((r) => r.kind === 'clinical').map((r) => r.caseId));
    const known = new Set(st.data.reviewItems.map((i) => i.id));
    const fromCases = Object.entries(CASES).filter(([id]) => done.has(id)).flatMap(([id, c]) => c.review.questions.filter((q) => !known.has(q.id)).map((q) => ({ q: q.id, id })));
    // pools do banco que o jogador já começou a estudar (aulas e quizzes)
    const studied = new Set(Object.keys(st.data.questionStats).filter((k) => BANK_QUESTIONS[k]).map((k) => BANK_QUESTIONS[k].pool));
    const fromBank = Object.values(BANK_QUESTIONS).filter((q) => studied.has(q.pool) && !known.has(q.id)).map((q) => ({ q: q.id, id: q.pool }));
    const pool = pickQuestions([...fromCases, ...fromBank].map((x) => ({ id: x.q, src: x.id })), 3, st.data.questionStats, Math.random);
    const now = Date.now();
    for (const x of pool) st.data.reviewItems = scheduleReview(st.data.reviewItems, x.id, x.src, now);
    queue = dueReviews(st.data.reviewItems, now).filter((i) => bank[i.id]).slice(0, 3);
    practice = queue.length > 0;
  }
  const body = h('div', { class: 'review-body' });
  const el = h('div', { class: 'overlay' }, h('div', { class: 'review panel', role: 'dialog', 'aria-label': 'Revisão espaçada' },
    h('h2', null, '🧠 Revisão espaçada'),
    h('p', { class: 'muted small' }, practice ? 'Você não tem pendências! Modo prática: perguntas dos casos que você já concluiu.' : 'Perguntas sobre pontos em que você teve dificuldade. Acertos espaçam a próxima revisão; erros fazem a pergunta voltar antes.'),
    body,
  ));
  const modal = ui().open({ el });
  let i = 0, correct = 0;
  const next = () => {
    clear(body);
    if (i >= queue.length) {
      body.append(
        h('p', null, queue.length ? `Sessão concluída: ${correct}/${queue.length} acertos.` : 'Nenhuma pergunta disponível agora. Conclua atendimentos para liberar perguntas de revisão!'),
        h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(modal) }, 'Fechar'),
      );
      return;
    }
    const item = queue[i];
    const q = bank[item.id];
    const sh = shuffleOptions(q, Math.random);
    const feedback = h('div', { class: 'review-feedback' });
    const opts = h('div', { class: 'review-options' });
    sh.options.forEach((o, oi) => {
      const b = h('button', { class: 'btn option' }, o);
      b.addEventListener('click', () => {
        const ok = oi === sh.correct;
        if (ok) correct++;
        app.audio.sfx(ok ? 'confirm' : 'error');
        opts.querySelectorAll('button').forEach((x, xi) => { (x as HTMLButtonElement).disabled = true; if (xi === sh.correct) x.classList.add('right'); else if (xi === oi) x.classList.add('wrong'); });
        st.answerReviewItem(item.id, ok);
        feedback.append(
          h('p', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Correto!' : '✘ Não exatamente.'),
          h('p', null, q.explanation),
          h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => { i++; next(); } }, i + 1 < queue.length ? 'Próxima' : 'Concluir'),
        );
        (feedback.querySelector('button') as HTMLButtonElement)?.focus();
      });
      opts.appendChild(b);
    });
    body.append(
      h('div', { class: 'review-meta' }, `Pergunta ${i + 1}/${queue.length} • ${q.topic} • origem: ${q.caseTitle} • caixa ${item.box}/5`),
      h('h3', null, q.prompt), opts, feedback,
    );
  };
  next();
}
