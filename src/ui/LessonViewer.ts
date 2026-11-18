/**
 * Aula de um professor: quadros clínicos explicativos, um por página.
 * Cada quadro tem situação clínica, explicação, pontos-chave, pergunta de reflexão (resposta revelada
 * pelo jogador) e referências. Ao chegar ao último quadro, a aula conta como estudada.
 */
import { app, requireState } from '../core/context';
import { bus, Events } from '../core/EventBus';
import { LESSONS, REFERENCE_MAP, VETIDEX_MAP } from '../content';
import { NPCS } from '../content/npcs';
import { DISCIPLINES } from '../content/disciplines';
import { buildPortrait } from '../art/characters';
import { h, clear } from './dom';
import { ui } from './UIManager';

export function openLesson(id: string): void {
  const lesson = LESSONS[id];
  if (!lesson) { console.error('Aula inexistente', id); return; }
  const st = requireState();
  const npc = NPCS.find((n) => n.id === lesson.npc);
  const disc = DISCIPLINES.find((d) => d.id === lesson.discipline);
  const total = lesson.cards.length;
  let page = -1; // -1 = introdução
  let done = false;

  const body = h('div', { class: 'lesson-body' });
  const dots = h('div', { class: 'lesson-dots', 'aria-hidden': 'true' });
  const prevBtn = h('button', { class: 'btn' }, '◀ Anterior') as HTMLButtonElement;
  const nextBtn = h('button', { class: 'btn btn-primary' }, 'Começar ▶') as HTMLButtonElement;
  const el = h('div', { class: 'overlay' }, h('div', { class: 'review panel lesson', role: 'dialog', 'aria-label': lesson.title },
    h('div', { class: 'quiz-head' },
      npc ? h('img', { class: 'pixel quiz-portrait', src: buildPortrait(npc.look, 'feliz').toDataURL(), alt: '' }) : null,
      h('div', null,
        h('div', { class: 'dlg-name' }, `${disc?.icon ?? ''} ${disc?.name ?? ''} • ${npc?.name ?? ''}`),
        h('h2', null, lesson.title),
        dots,
      ),
      h('button', { class: 'btn btn-small lesson-close', 'aria-label': 'Fechar aula', onclick: () => ui().close(modal) }, '✕'),
    ),
    body,
    h('div', { class: 'menu-footer' }, prevBtn, nextBtn),
  ));

  const complete = () => {
    if (done) return;
    done = true;
    st.apply(lesson.onComplete, `lesson.${lesson.id}`);
    st.save();
  };

  const render = () => {
    clear(body); clear(dots);
    for (let k = 0; k < total; k++) dots.appendChild(h('span', { class: 'pip' + (k <= page ? ' on' : '') }, k <= page ? '●' : '○'));
    dots.appendChild(h('span', { class: 'small muted' }, page < 0 ? ` ${total} quadros clínicos` : ` Quadro ${page + 1} de ${total}`));
    prevBtn.disabled = page < 0;
    if (page < 0) {
      body.append(h('p', { class: 'lesson-intro' }, st.interpolate(lesson.intro)),
        h('p', { class: 'small muted' }, 'Leia cada situação, pense na pergunta antes de revelar a resposta e confira as referências. Depois, faça o questionário com o professor.'));
      nextBtn.textContent = 'Começar ▶';
    } else {
      const c = lesson.cards[page];
      const answer = h('div', { class: 'lesson-answer', hidden: true }, c.think.answer);
      const reveal = h('button', { class: 'btn btn-small', 'aria-expanded': 'false' }, 'Revelar resposta') as HTMLButtonElement;
      reveal.addEventListener('click', () => { answer.hidden = false; reveal.remove(); app.audio.sfx('confirm'); });
      const dex = c.vetidexId ? VETIDEX_MAP[c.vetidexId] : undefined;
      body.append(
        h('h3', { class: 'lesson-title' }, c.title),
        h('div', { class: 'lesson-case' }, h('div', { class: 'lesson-label' }, '🩺 Quadro clínico'), h('p', null, c.scenario)),
        h('div', { class: 'lesson-label' }, '📖 Explicação'),
        h('p', null, c.explanation),
        h('div', { class: 'lesson-label' }, '⭐ Pontos-chave'),
        h('ul', { class: 'lesson-points' }, ...c.keyPoints.map((k) => h('li', null, k))),
        h('div', { class: 'lesson-think' }, h('div', { class: 'lesson-label' }, '💭 Pense'), h('p', null, c.think.question), reveal, answer),
        ...(dex ? [h('p', { class: 'small muted' }, `VetiDex: ${dex.name} (liberada ao concluir a aula)`)] : []),
        h('div', { class: 'lesson-refs small muted' }, 'Referências: ', ...c.refs.map((r, i) => h('span', null, (i ? ' • ' : '') + (REFERENCE_MAP[r]?.citation ?? r)))),
      );
      nextBtn.textContent = page === total - 1 ? (done ? 'Fechar' : 'Concluir aula ✔') : 'Próximo ▶';
    }
    body.scrollTop = 0;
    (el.querySelector('.lesson') as HTMLElement).scrollTop = 0;
  };

  prevBtn.addEventListener('click', () => { if (page >= 0) { page--; app.audio.sfx('page'); render(); } });
  nextBtn.addEventListener('click', () => {
    if (page === total - 1) {
      const first = !done;
      complete();
      app.audio.sfx('success');
      if (first) {
        clear(body);
        body.append(
          h('p', { class: 'ok' }, '✔ Aula concluída!'),
          h('p', null, `Os conteúdos desta aula foram adicionados à VetiDex. Quando quiser, fale com ${npc?.name ?? 'o professor'} para fazer o questionário.`),
        );
        nextBtn.textContent = 'Fechar';
        prevBtn.disabled = false;
        page = total; // estado final
        return;
      }
      ui().close(modal);
      return;
    }
    if (page === total) { ui().close(modal); return; }
    page++; app.audio.sfx('page'); render();
  });

  const modal = ui().open({
    el,
    onClose: () => bus.emit(Events.WorldRefresh),
    onAction: (a) => {
      if (a === 'right') { nextBtn.click(); return true; }
      if (a === 'left' && !prevBtn.disabled) { prevBtn.click(); return true; }
      return false;
    },
  });
  render();
  nextBtn.focus();
}
