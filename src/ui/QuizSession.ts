/**
 * Quiz conduzido por um personagem, com perguntas sorteadas do banco.
 * Erros mostram a explicação, são agendados na revisão espaçada e geram uma nova pergunta.
 */
import { app, requireState } from '../core/context';
import { bus, Events } from '../core/EventBus';
import { QUIZZES } from '../content/quizzes';
import { QUESTION_POOLS } from '../content';
import { NPCS } from '../content/npcs';
import { buildPortrait } from '../art/characters';
import { pickQuestions, shuffleOptions } from '../systems/questions/bank';
import { h, clear } from './dom';
import { ui } from './UIManager';

export function openQuiz(id: string): void {
  const quiz = QUIZZES[id];
  const pool = quiz && QUESTION_POOLS[quiz.pool];
  if (!quiz || !pool) { console.error('Quiz inexistente', id); return; }
  const st = requireState();
  const questions = pickQuestions(pool.questions, quiz.maxQuestions, st.data.questionStats, Math.random);
  const npc = NPCS.find((n) => n.id === quiz.npc);
  const portrait = (expr: 'neutro' | 'feliz' | 'preocupado') => (npc ? buildPortrait(npc.look, expr).toDataURL() : '');
  const img = h('img', { class: 'pixel quiz-portrait', src: portrait('neutro'), alt: '' });
  const body = h('div', { class: 'review-body' });
  const progress = h('div', { class: 'quiz-progress' });
  const el = h('div', { class: 'overlay' }, h('div', { class: 'review panel quiz', role: 'dialog', 'aria-label': quiz.title },
    h('div', { class: 'quiz-head' }, img, h('div', null, h('div', { class: 'dlg-name' }, npc?.name ?? ''), h('h2', null, quiz.title), progress)),
    body,
  ));
  const modal = ui().open({ el, onClose: () => bus.emit(Events.WorldRefresh) });
  let i = 0, correct = 0;
  const pips = () => {
    clear(progress);
    for (let k = 0; k < quiz.required; k++) progress.appendChild(h('span', { class: 'pip' + (k < correct ? ' on' : '') }, k < correct ? '★' : '☆'));
    progress.appendChild(h('span', { class: 'small muted' }, ` ${correct}/${quiz.required} acertos • pergunta ${Math.min(i + 1, quiz.maxQuestions)} de no máximo ${quiz.maxQuestions}`));
  };
  const finish = (ok: boolean) => {
    clear(body);
    img.src = portrait(ok ? 'feliz' : 'preocupado');
    app.audio.sfx(ok ? 'success' : 'cancel');
    body.append(
      h('p', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Aprovado!' : '✘ Não foi desta vez.'),
      h('p', null, st.interpolate(ok ? quiz.successText : quiz.failText)),
      h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(modal) }, 'Continuar'),
    );
    (body.querySelector('button') as HTMLButtonElement).focus();
    if (ok) st.apply(quiz.onComplete, `quiz.${quiz.id}`);
    st.save();
  };
  const next = () => {
    pips();
    if (correct >= quiz.required) return finish(true);
    const remaining = questions.length - i;
    if (remaining <= 0 || correct + remaining < quiz.required) return finish(false);
    clear(body);
    img.src = portrait('neutro');
    const q = questions[i];
    const sh = shuffleOptions(q, Math.random);
    const feedback = h('div', { class: 'review-feedback' });
    const opts = h('div', { class: 'review-options' });
    sh.options.forEach((o, oi) => {
      const b = h('button', { class: 'btn option' }, o);
      b.addEventListener('click', () => {
        const ok = oi === sh.correct;
        if (ok) correct++;
        st.recordQuestion(q.id, ok);
        if (!ok) st.scheduleBankReview(q.id, `quiz:${quiz.id}`);
        img.src = portrait(ok ? 'feliz' : 'preocupado');
        app.audio.sfx(ok ? 'confirm' : 'error');
        opts.querySelectorAll('button').forEach((x, xi) => { (x as HTMLButtonElement).disabled = true; if (xi === sh.correct) x.classList.add('right'); else if (xi === oi) x.classList.add('wrong'); });
        feedback.append(
          h('p', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Correto!' : '✘ Não exatamente.'),
          h('p', null, q.explanation),
          h('button', { class: 'btn btn-primary', onclick: () => { i++; next(); } }, 'Próxima'),
        );
        (feedback.querySelector('button') as HTMLButtonElement).focus();
        pips();
      });
      opts.appendChild(b);
    });
    body.append(h('h3', null, q.prompt), opts, feedback);
  };
  clear(body);
  body.append(h('p', null, quiz.intro), h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => next() }, 'Começar'));
  pips();
}
