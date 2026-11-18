/**
 * Minigame "Anatomia Interativa": identificar ossos em um esquema do esqueleto do cão
 * e responder perguntas de anatomia comparada, com feedback explicativo a cada resposta.
 */
import { askConfirm } from './ConfirmDialog';
import { app, requireState } from '../core/context';
import { bus, Events } from '../core/EventBus';
import { MINIGAMES, QUESTION_POOLS, REFERENCE_MAP, type AnatomyMinigame } from '../content';
import { pickQuestions, shuffleOptions, type BankQuestion } from '../systems/questions/bank';
import { hotspotPoints, scoreMinigame, type MinigameAttempts } from '../systems/cases/minigameScoring';
import { h, clear } from './dom';
import { ui, type Modal } from './UIManager';

/** Esquema didático simplificado (vista lateral esquerda, fora de escala). */
const SKELETON_SVG = `
<svg viewBox="0 0 400 240" class="skeleton-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Esquema do esqueleto do cão">
  <defs>
    <linearGradient id="bone" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fbf4e2"/><stop offset="1" stop-color="#e0d3b2"/></linearGradient>
  </defs>
  <rect x="0" y="0" width="400" height="240" fill="#22324a"/>
  <g stroke="#2a3d57" stroke-width="1">${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="240"/>`).join('')}${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${i * 20}" x2="400" y2="${i * 20}"/>`).join('')}</g>
  <line x1="10" y1="228" x2="390" y2="228" stroke="#4a6585" stroke-width="2" stroke-dasharray="6 4"/>
  <g fill="url(#bone)" stroke="#5b4a35" stroke-width="2" stroke-linejoin="round">
    <!-- crânio -->
    <path d="M28 84 Q30 70 46 64 Q66 52 92 54 Q106 58 108 72 Q106 86 94 92 L60 94 Q40 94 30 92 Z"/>
    <circle cx="74" cy="70" r="8" fill="#22324a"/>
    <!-- mandíbula -->
    <path d="M32 96 L92 98 Q98 90 94 84 L98 86 Q102 100 92 106 L40 104 Q32 102 32 96 Z"/>
    <!-- vértebras cervicais -->
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${108 + i * 6.5}" y="${80 + i * 2.6}" width="6" height="9" rx="2"/>`).join('')}
    <!-- coluna torácica/lombar -->
    ${Array.from({ length: 13 }, (_, i) => `<rect x="${154 + i * 8}" y="${96 - (i < 4 ? 2 : 0)}" width="7" height="9" rx="2"/><rect x="${156 + i * 8}" y="${78 + Math.min(i, 8) * 1.2}" width="3" height="${18 - Math.min(i, 8) * 1.2}"/>`).join('')}
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${258 + i * 8}" y="${97 + i * 0.6}" width="7" height="9" rx="2"/><rect x="${259 + i * 8}" y="${105 + i * 0.6}" width="6" height="3"/>`).join('')}
    <!-- sacro e cauda -->
    <path d="M314 100 L334 102 L336 110 L314 108 Z"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="${336 + i * 5.2}" y="${108 + i * 3.4}" width="${5 - i * 0.25}" height="${6 - i * 0.3}" rx="1.5"/>`).join('')}
    <!-- costelas -->
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${160 + i * 10} 106 Q${150 + i * 10} 140 ${168 + i * 9} ${162 + Math.sin(i / 3) * 6}" fill="none" stroke-width="3.5" stroke="#e8dcbd"/>`).join('')}
    <path d="M152 160 Q200 172 246 168" fill="none" stroke-width="4" stroke="#e8dcbd"/>
    <!-- escápula -->
    <path d="M150 74 L184 78 L172 128 L162 128 Z"/>
    <!-- úmero -->
    <path d="M164 126 Q172 124 174 130 L170 170 Q166 176 160 170 L160 134 Z"/>
    <!-- rádio e ulna -->
    <path d="M160 170 L176 166 L182 160 L180 172 L172 212 L164 212 Z"/>
    <!-- carpo, metacarpo e falanges -->
    <rect x="162" y="212" width="12" height="5" rx="2"/>
    <path d="M163 217 L173 217 L170 226 L156 228 L158 224 Z"/>
    <!-- pelve -->
    <path d="M306 96 L330 100 L346 122 L336 128 L318 116 L304 104 Z"/>
    <circle cx="322" cy="114" r="4" fill="#cdbd98"/>
    <!-- fêmur -->
    <path d="M318 112 Q326 112 326 120 L312 164 Q306 170 302 164 L314 118 Z"/>
    <circle cx="302" cy="163" r="3.5"/>
    <!-- tíbia e fíbula -->
    <path d="M304 164 L312 164 L332 198 L326 202 Z"/>
    <path d="M310 168 L314 168 L330 196 L328 198 Z"/>
    <!-- tarso / calcâneo -->
    <path d="M324 198 L336 192 L342 196 L332 206 L326 206 Z"/>
    <!-- metatarso e falanges -->
    <path d="M326 206 L332 206 L326 224 L312 228 L314 224 L322 220 Z"/>
  </g>
</svg>`;

export function openMinigame(id: string): void {
  const mg = MINIGAMES[id];
  if (!mg) { console.error('Minigame inexistente', id); return; }
  new AnatomySession(mg).open();
}

class AnatomySession {
  private attempts: MinigameAttempts = { hotspotTries: {}, quizAnswers: {} };
  private modal!: Modal;
  private body!: HTMLElement;
  private round = 0;
  private qIndex = 0;
  private phase: 'intro' | 'hotspots' | 'quiz' | 'result' = 'intro';

  private rounds: string[];
  private questions: BankQuestion[];

  constructor(private mg: AnatomyMinigame) {
    // sorteio a cada tentativa: prioriza estruturas e perguntas ainda não vistas
    const stats = requireState().data.questionStats;
    this.rounds = pickQuestions(mg.hotspots.structures, mg.hotspots.count, stats, Math.random, (s) => `hs:${s.id}`).map((s) => s.id);
    this.questions = pickQuestions(QUESTION_POOLS[mg.quiz.pool].questions, mg.quiz.count, stats, Math.random);
  }

  open(): void {
    this.body = h('div', { class: 'mg-body' });
    const el = h('div', { class: 'overlay' }, h('div', { class: 'minigame panel', role: 'dialog', 'aria-label': this.mg.title },
      h('div', { class: 'mg-header' }, h('h2', null, `🦴 ${this.mg.title}`), h('span', { class: 'badge badge-edu', title: this.mg.educationalNotice }, 'Esquema didático • validação pendente'),
        h('button', { class: 'btn small', onclick: async () => { if (this.phase === 'result' || (await askConfirm('Sair da atividade? O progresso será perdido.', 'Sair'))) this.close(); } }, 'Sair')),
      this.body));
    this.modal = ui().open({ el, persistent: true });
    app.audio.play('lab');
    this.render();
  }

  private close(): void {
    ui().close(this.modal);
    bus.emit(Events.WorldRefresh);
  }

  private render(): void {
    clear(this.body);
    if (this.phase === 'intro') {
      this.body.append(
        h('p', null, this.mg.intro),
        h('ul', null, h('li', null, `Parte 1 — Identifique ${this.rounds.length} estruturas no esqueleto (acerto na 1ª tentativa vale mais).`), h('li', null, `Parte 2 — ${this.questions.length} perguntas de anatomia comparada.`), h('li', null, `Nota mínima para aprovação: ${this.mg.passScore}.`)),
        h('div', { class: 'case-actions' }, h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => { this.phase = 'hotspots'; this.render(); } }, 'Começar')),
      );
    } else if (this.phase === 'hotspots') this.renderHotspot();
    else if (this.phase === 'quiz') this.renderQuiz();
    else this.renderResult();
  }

  private renderHotspot(): void {
    const hs = this.mg.hotspots;
    const targetId = this.rounds[this.round];
    const target = hs.structures.find((s) => s.id === targetId)!;
    const feedback = h('div', { class: 'mg-feedback' });
    const stage = h('div', { class: 'skeleton-wrap', html: SKELETON_SVG });
    const svg = stage.querySelector('svg')!;
    let tries = 0;
    let solved = false;
    const finishRound = (ok: boolean) => {
      solved = true;
      this.attempts.hotspotTries[targetId] = ok ? tries : 3;
      requireState().recordQuestion(`hs:${targetId}`, ok && tries === 1);
      svg.querySelectorAll('.hotspot').forEach((c) => c.classList.add('disabled'));
      const correctEl = svg.querySelector(`[data-id="${targetId}"]`);
      correctEl?.classList.add('correct');
      const pts = hotspotPoints(ok ? tries : 3, hs.pointsEach);
      clear(feedback);
      feedback.append(
        h('p', { class: ok ? 'ok' : 'bad' }, ok ? (tries === 1 ? `✔ Correto na primeira tentativa! (+${pts} pts)` : `✔ Correto na segunda tentativa (+${pts} pts)`) : `A estrutura correta está destacada: ${target.name}.`),
        h('p', null, target.info),
        h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => { this.round++; if (this.round >= this.rounds.length) this.phase = 'quiz'; this.render(); } }, this.round + 1 < this.rounds.length ? 'Próxima estrutura' : 'Ir para anatomia comparada'),
      );
      (feedback.querySelector('button') as HTMLButtonElement).focus();
    };
    for (const s of hs.structures) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', String(s.x));
      c.setAttribute('cy', String(s.y));
      c.setAttribute('r', '9');
      c.setAttribute('class', 'hotspot');
      c.setAttribute('data-id', s.id);
      c.setAttribute('tabindex', '0');
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', 'Estrutura anatômica');
      const pick = () => {
        if (solved || c.classList.contains('wrong')) return;
        tries++;
        if (s.id === targetId) { app.audio.sfx('confirm'); finishRound(true); return; }
        app.audio.sfx('error');
        c.classList.add('wrong');
        clear(feedback);
        feedback.append(h('p', { class: 'bad' }, `✘ Essa estrutura é: ${s.name}.`), h('p', { class: 'small muted' }, s.info));
        if (tries >= 2) finishRound(false);
      };
      c.addEventListener('click', pick);
      c.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); pick(); } });
      svg.appendChild(c);
    }
    this.body.append(
      h('div', { class: 'mg-progress' }, `Parte 1 — Estrutura ${this.round + 1}/${this.rounds.length}`),
      h('h3', { class: 'mg-prompt' }, `Clique na região correspondente: ${target.name}`),
      stage,
      h('p', { class: 'small muted' }, 'Esquema didático simplificado, fora de escala. Os círculos marcam regiões anatômicas.'),
      feedback,
    );
  }

  private renderQuiz(): void {
    const q = this.questions[this.qIndex];
    const feedback = h('div', { class: 'mg-feedback' });
    const opts = h('div', { class: 'review-options' });
    const sh = shuffleOptions(q, Math.random);
    sh.options.forEach((o, i) => {
      const b = h('button', { class: 'btn option' }, o);
      b.addEventListener('click', () => {
        const ok = i === sh.correct;
        this.attempts.quizAnswers[q.id] = ok ? q.correctIndex : -1;
        requireState().recordQuestion(q.id, ok);
        if (!ok) requireState().scheduleBankReview(q.id, this.mg.id);
        app.audio.sfx(ok ? 'confirm' : 'error');
        opts.querySelectorAll('button').forEach((x, xi) => { (x as HTMLButtonElement).disabled = true; if (xi === sh.correct) x.classList.add('right'); else if (xi === i) x.classList.add('wrong'); });
        feedback.append(
          h('p', { class: ok ? 'ok' : 'bad' }, ok ? '✔ Correto!' : '✘ Resposta incorreta.'),
          h('p', null, q.explanation),
          h('button', { class: 'btn btn-primary', onclick: () => { this.qIndex++; if (this.qIndex >= this.questions.length) this.phase = 'result'; this.render(); } }, this.qIndex + 1 < this.questions.length ? 'Próxima pergunta' : 'Ver resultado'),
        );
        (feedback.querySelector('button') as HTMLButtonElement).focus();
      });
      opts.appendChild(b);
    });
    this.body.append(h('div', { class: 'mg-progress' }, `Parte 2 — Pergunta ${this.qIndex + 1}/${this.questions.length}`), h('h3', { class: 'mg-prompt' }, q.prompt), opts, feedback);
  }

  private renderResult(): void {
    const mg = this.mg;
    const res = scoreMinigame({ hotspots: { pointsEach: mg.hotspots.pointsEach, rounds: this.rounds }, quiz: { pointsEach: mg.quiz.pointsEach, questions: this.questions }, passScore: mg.passScore }, this.attempts);
    const st = requireState();
    const { xp } = st.recordMinigame({
      id: mg.id, title: mg.title, missionId: mg.missionId, total: res.total, passScore: mg.passScore, baseXp: mg.baseXp,
      sections: { Identificação: res.hotspotsPct, Comparada: res.quizPct },
      disciplines: mg.disciplines.map((d) => ({ discipline: d.discipline, skill: d.skill, pct: d.part === 'hotspots' ? res.hotspotsPct : res.quizPct })),
      dex: mg.vetidexUnlocks,
    });
    app.audio.sfx(res.passed ? 'success' : 'cancel');
    this.body.append(
      h('div', { class: 'result-head ' + (res.passed ? 'success' : 'partial') },
        h('div', { class: 'score-ring' }, h('div', { class: 'score-num' }, String(res.total)), h('div', { class: 'score-of' }, '/100')),
        h('div', null,
          h('h2', null, res.passed ? 'Aula concluída!' : 'Quase lá!'),
          h('p', null, res.passed ? 'O Prof. Otávio aprova seu desempenho. Novas entradas foram adicionadas ao VetiDex.' : `A nota mínima é ${mg.passScore}. Revise as explicações e tente novamente com o Prof. Otávio — a próxima tentativa sorteia estruturas e perguntas diferentes.`),
          h('p', { class: 'small' }, `Identificação de estruturas: ${res.hotspotsPct}% • Anatomia comparada: ${res.quizPct}% • +${xp} XP`),
        )),
      h('div', { class: 'card refs-card' }, h('h3', null, 'Referência'), h('ol', { class: 'refs' }, ...mg.references.map((r) => h('li', null, REFERENCE_MAP[r.refId]?.citation ?? r.refId))), h('p', { class: 'disclaimer' }, mg.educationalNotice)),
      h('div', { class: 'case-actions' }, h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => this.close() }, 'Concluir')),
    );
  }
}
