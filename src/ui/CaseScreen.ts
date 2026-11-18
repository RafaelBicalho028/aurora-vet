/**
 * Tela de atendimento clínico: Anamnese → Exame físico → Exames complementares → Diagnóstico → Conduta → Resultado.
 * A lógica de pontuação fica em systems/cases/scoring.ts (pura e testada).
 */
import { askConfirm } from './ConfirmDialog';
import { app, requireState } from '../core/context';
import { bus, Events } from '../core/EventBus';
import { CASES, REFERENCE_MAP, VETIDEX_MAP } from '../content';
import { NPCS } from '../content/npcs';
import { buildPortrait } from '../art/characters';
import { buildAllAnimals } from '../art/animals';
import { availableQuestions, clinicalMinutes, collectedFindings, scoreCase } from '../systems/cases/scoring';
import { emptyDecisions, type ClinicalCase, type ExamItem, type PlayerDecisions, type ScoreReport, type SectionId } from '../systems/cases/caseTypes';
import { h, clear, frameCanvas } from './dom';
import { shuffledCase } from '../systems/cases/shuffleCase';
import { ui, type Modal } from './UIManager';
import { openVetiDexEntry } from './MenuScreen';

type Stage = SectionId | 'result';
const STAGES: { id: Stage; label: string; letter: string }[] = [
  { id: 'anamnesis', label: 'Anamnese', letter: 'A' },
  { id: 'physicalExam', label: 'Exame físico', letter: 'B' },
  { id: 'tests', label: 'Exames', letter: 'C' },
  { id: 'diagnosis', label: 'Diagnóstico', letter: 'D' },
  { id: 'conduct', label: 'Conduta', letter: 'E' },
  { id: 'result', label: 'Resultado', letter: 'F' },
];
const GROUP_LABELS: Record<ExamItem['group'], string> = { vitais: 'Sinais vitais', geral: 'Exame físico geral', sistemas: 'Sistemas', especifico: 'Exame específico' };
const TYPE_LABELS: Record<string, string> = { observacao: 'Observação', suporte: 'Suporte', tratamento: 'Tratamento', encaminhamento: 'Encaminhamento', internacao: 'Internação', procedimento: 'Procedimento supervisionado', prevencao: 'Prevenção / orientação' };

const animalImgCache: Record<string, string> = {};
function animalImg(key: string): string {
  if (!animalImgCache[key]) {
    const a = buildAllAnimals().find((x) => x.key === key)!;
    animalImgCache[key] = frameCanvas(a.canvas, a.frameW, a.frameH, 0).toDataURL();
  }
  return animalImgCache[key];
}
function npcPortrait(id: string, expr: 'neutro' | 'feliz' | 'preocupado' | 'surpreso' = 'neutro'): string {
  const n = NPCS.find((x) => x.id === id);
  return n ? buildPortrait(n.look, expr).toDataURL() : '';
}

export function openCase(caseId: string): void {
  const c = CASES[caseId];
  if (!c) { console.error('Caso inexistente', caseId); return; }
  const attempt = requireState().attemptsOf(caseId);
  new CaseSession(attempt === 0 ? c : shuffledCase(c, attempt)).open();
}

class CaseSession {
  private d: PlayerDecisions = emptyDecisions();
  private stage: Stage = 'anamnesis';
  private reached = new Set<Stage>(['anamnesis']);
  private log: { who: 'player' | 'tutor' | 'sup'; text: string }[] = [];
  private warnings: string[] = [];
  private modal!: Modal;
  private root!: HTMLElement;
  private main!: HTMLElement;
  private side!: HTMLElement;
  private steps!: HTMLElement;
  private costEl!: HTMLElement;
  private sideBtn!: HTMLButtonElement;
  private timeEl!: HTMLElement;
  private delayWarned = false;
  private renderedStage: Stage | null = null;
  private report: ScoreReport | null = null;

  constructor(private c: ClinicalCase) {}

  open(): void {
    const c = this.c;
    const p = c.patient;
    this.main = h('div', { class: 'case-main' });
    this.side = h('aside', { class: 'case-side' });
    this.steps = h('div', { class: 'case-steps' });
    this.costEl = h('div', { class: 'case-cost' });
    this.timeEl = h('div', { class: 'case-time', role: 'status' });
    const header = h('header', { class: 'case-header' },
      h('div', { class: 'patient' },
        h('img', { src: animalImg(p.sprite), class: 'pixel patient-img', alt: p.name }),
        h('div', null,
          h('div', { class: 'case-title' }, c.title),
          h('div', { class: 'patient-line' }, `${p.name} • ${p.speciesLabel} • ${p.breed} • ${p.sex} • ${p.age} • ${p.weightKg.toLocaleString('pt-BR')} kg`),
          h('div', { class: 'patient-line muted' }, `Tutor(a): ${p.tutorName} — “${p.presentingComplaint}”`),
        ),
      ),
      h('div', { class: 'case-header-right' },
        h('span', { class: 'badge badge-edu', title: c.educationalNotice }, 'Material educacional • validação pendente'),
        h('span', { class: 'badge' }, `Dificuldade ${'★'.repeat(c.difficulty)}${'☆'.repeat(5 - c.difficulty)}`),
        this.timeEl,
        this.costEl,
        (this.sideBtn = h('button', { class: 'btn small side-toggle', onclick: () => { this.root.classList.toggle('show-side'); this.render(); } }, '🗂 Prontuário')),
        h('button', { class: 'btn small', onclick: () => this.confirmExit() }, 'Sair'),
      ),
    );
    this.root = h('div', { class: 'case-screen', role: 'dialog', 'aria-label': 'Atendimento clínico' },
      header, this.steps, h('div', { class: 'case-body' }, this.side, this.main));
    this.modal = ui().open({ el: this.root, persistent: true, onAction: (a) => a !== 'menu' ? false : (this.confirmExit(), true) });
    app.audio.play('case');
    this.log.push({ who: 'sup', text: c.intro });
    if (c.clinicalTime?.urgent) this.log.push({ who: 'sup', text: `⚠ CASO URGENTE: você tem cerca de ${c.clinicalTime.budgetMinutes} minutos clínicos até definir a conduta. Cada pergunta, exame físico e exame complementar consome tempo — priorize o que muda a conduta imediata.` });
    this.render();
  }

  private confirmExit(): void {
    if (this.stage === 'result') { this.finish(); return; }
    void askConfirm('Sair do atendimento? O progresso deste atendimento será perdido.', 'Sair').then((ok) => { if (ok) this.finish(false); });
  }

  private finish(completed = true): void {
    ui().close(this.modal);
    const map = requireState().data.player.mapId;
    app.audio.play(map === 'campus' ? 'campus' : map === 'hospital' ? 'clinic' : 'lab');
    bus.emit(Events.WorldRefresh);
    void completed;
  }

  private go(s: Stage): void {
    this.stage = s;
    this.reached.add(s);
    app.audio.sfx('page');
    this.render(true);
  }

  /**
   * Redesenha a tela. Dentro da mesma etapa, preserva a rolagem do conteúdo, do prontuário
   * e do chat (cada clique redesenha a tela, e antes isso fazia a página voltar ao topo).
   */
  private render(resetScroll = false): void {
    const keep = !resetScroll && this.renderedStage === this.stage;
    const mainTop = keep ? this.main.scrollTop : 0;
    const sideTop = keep ? this.side.scrollTop : 0;
    const focusKey = keep ? (document.activeElement as HTMLElement | null)?.dataset?.fk : undefined;
    this.renderStage();
    this.renderedStage = this.stage;
    this.main.scrollTop = mainTop;
    this.side.scrollTop = sideTop;
    if (focusKey) (this.root.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private renderStage(): void {
    // etapas
    clear(this.steps);
    const nFound = collectedFindings(this.c, this.d).length;
    const open = this.root.classList.contains('show-side');
    this.sideBtn.textContent = open ? '✕ Fechar prontuário' : `🗂 Prontuário (${nFound})`;
    this.sideBtn.setAttribute('aria-expanded', String(open));
    this.sideBtn.style.visibility = this.stage === 'result' ? 'hidden' : '';
    STAGES.forEach((s) => {
      const idx = STAGES.findIndex((x) => x.id === this.stage);
      const i = STAGES.findIndex((x) => x.id === s.id);
      this.steps.appendChild(h('div', { class: 'step' + (s.id === this.stage ? ' current' : i < idx ? ' done' : '') }, h('span', { class: 'step-letter' }, s.letter), h('span', { class: 'step-label' }, s.label)));
    });
    const cost = this.d.requestedTests.reduce((a, id) => a + (this.c.tests.items.find((t) => t.id === id)?.cost ?? 0), 0);
    this.costEl.textContent = `Exames: R$ ${cost}`;
    const minutes = clinicalMinutes(this.c, this.d);
    const ct = this.c.clinicalTime;
    this.timeEl.textContent = ct?.urgent ? `⏱ ${minutes}/${ct.budgetMinutes} min` : `⏱ ${minutes} min`;
    this.timeEl.title = ct?.urgent ? 'Tempo clínico estimado até a conduta. Caso urgente: passar da meta reduz a nota.' : 'Tempo clínico estimado (referência).';
    this.timeEl.classList.toggle('over', !!ct?.urgent && minutes > ct.budgetMinutes);
    if (ct?.urgent && minutes > ct.budgetMinutes && !this.delayWarned && this.stage !== 'result') {
      this.delayWarned = true;
      this.warnings.push(`O paciente está piorando! Já se passaram ${minutes} min (meta: ${ct.budgetMinutes}). Priorize o que muda a conduta imediata.`);
      app.audio.sfx('error');
    }
    this.renderSide();
    clear(this.main);
    switch (this.stage) {
      case 'anamnesis': this.renderAnamnesis(); break;
      case 'physicalExam': this.renderExam(); break;
      case 'tests': this.renderTests(); break;
      case 'diagnosis': this.renderDiagnosis(); break;
      case 'conduct': this.renderConduct(); break;
      case 'result': this.renderResult(); break;
    }
  }

  private renderSide(): void {
    clear(this.side);
    const sup = this.c.supervisor;
    if (this.stage !== 'result') {
      this.side.appendChild(h('div', { class: 'supervisor card' },
        h('img', { src: npcPortrait(sup.npc), class: 'pixel sup-img', alt: '' }),
        h('div', null, h('div', { class: 'sup-name' }, `${sup.name} (supervisora)`), h('p', null, sup.tips[this.stage as SectionId])),
      ));
    }
    const found = collectedFindings(this.c, this.d);
    this.side.appendChild(h('div', { class: 'card record' },
      h('h4', null, '🗂 Prontuário — achados'),
      found.length ? h('ul', null, ...found.map((id) => h('li', null, this.c.findings.find((f) => f.id === id)!.label))) : h('p', { class: 'muted small' }, 'Os achados relevantes aparecem aqui conforme você investiga.'),
    ));
    if (this.warnings.length) this.side.appendChild(h('div', { class: 'card warn-card' }, h('h4', null, '⚠ Alertas da supervisão'), ...this.warnings.map((w) => h('p', { class: 'small' }, w))));
  }

  // ------------------------------------------------------------ A. Anamnese
  private renderAnamnesis(): void {
    const c = this.c;
    const tutorId = c.patient.tutorNpc;
    const chat = h('div', { class: 'chat' }, ...this.log.map((m) => this.chatLine(m)));
    const avail = availableQuestions(c, this.d.askedQuestions);
    const groups = new Map<string, typeof avail>();
    avail.forEach((q) => groups.set(q.category, [...(groups.get(q.category) ?? []), q]));
    const qBox = h('div', { class: 'questions' });
    for (const [cat, qs] of groups) {
      qBox.appendChild(h('div', { class: 'q-group' }, h('div', { class: 'q-cat' }, cat), ...qs.map((q) => {
        const asked = this.d.askedQuestions.includes(q.id);
        const isNew = !!q.requires?.length && !asked;
        const b = h('button', { class: 'btn q-btn' + (asked ? ' asked' : '') + (isNew ? ' new' : ''), disabled: asked, 'data-fk': `q-${q.id}` }, (asked ? '✔ ' : isNew ? '✦ ' : '') + q.text);
        b.addEventListener('click', () => {
          this.d.askedQuestions.push(q.id);
          this.log.push({ who: 'player', text: q.text }, { who: 'tutor', text: q.answer });
          app.audio.sfx('blip');
          this.render();
          const ch = this.main.querySelector('.chat');
          if (ch) ch.scrollTop = ch.scrollHeight;
        });
        return b;
      })));
    }
    this.main.append(
      h('h2', null, 'A. Anamnese'),
      h('p', { class: 'muted small' }, `Escolha as perguntas para o(a) tutor(a). Algumas informações são essenciais, outras complementares — e perguntas de aprofundamento (✦) surgem conforme a conversa. Perguntas feitas: ${this.d.askedQuestions.length}.`),
      h('div', { class: 'anam-layout' },
        h('div', { class: 'tutor-col' }, h('img', { src: npcPortrait(tutorId, 'preocupado'), class: 'pixel tutor-img', alt: '' }), h('div', { class: 'small' }, c.patient.tutorName)),
        chat,
      ),
      qBox,
      h('div', { class: 'case-actions' },
        h('button', { class: 'btn btn-primary', disabled: this.d.askedQuestions.length === 0, onclick: () => this.go('physicalExam') }, 'Encerrar anamnese → Exame físico'),
      ),
    );
    requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
  }

  private chatLine(m: { who: 'player' | 'tutor' | 'sup'; text: string }): HTMLElement {
    const st = requireState();
    const who = m.who === 'player' ? st.data.player.name : m.who === 'tutor' ? this.c.patient.tutorName : this.c.supervisor.name;
    return h('div', { class: `chat-line ${m.who}` }, h('div', { class: 'chat-who' }, who), h('div', { class: 'chat-text' }, m.text));
  }

  // ------------------------------------------------------------ B. Exame físico
  private renderExam(): void {
    const c = this.c;
    const st = requireState();
    const hasGuide = !!st.data.inventory['guia_bolso'];
    const groups = new Map<string, ExamItem[]>();
    c.physicalExam.items.forEach((i) => groups.set(i.group, [...(groups.get(i.group) ?? []), i]));
    const wrap = h('div', { class: 'exam-groups' });
    for (const [g, items] of groups) {
      wrap.appendChild(h('div', { class: 'exam-group' }, h('h3', null, GROUP_LABELS[g as ExamItem['group']]), ...items.map((it) => {
        const done = this.d.examined.includes(it.id);
        const interp = this.d.interpretations[it.id];
        const ref = it.reference ? (typeof it.reference === 'string' ? it.reference : `${it.reference.min.toLocaleString('pt-BR')}–${it.reference.max.toLocaleString('pt-BR')} ${it.reference.unit}${it.reference.note ? ` (${it.reference.note})` : ''}`) : '';
        const showRef = done && ref && (typeof it.reference === 'string' || hasGuide);
        const card = h('div', { class: 'exam-item card' + (done ? ' done' : '') },
          h('div', { class: 'exam-label' }, it.label),
          done ? h('div', { class: 'exam-result' }, it.result) : h('button', {
            class: 'btn small', 'data-fk': `e-${it.id}`, onclick: () => { this.d.examined.push(it.id); app.audio.sfx('select'); this.render(); },
          }, 'Avaliar'),
          showRef ? h('div', { class: 'exam-ref small muted' }, `Referência: ${ref}`) : done && ref && !hasGuide ? h('div', { class: 'exam-ref small muted' }, 'Referência numérica: consulte o VetiDex (Parâmetros vitais) ou obtenha o guia de bolso com a Profa. Lívia.') : null,
          done ? h('div', { class: 'interp' },
            h('button', { class: 'chip' + (interp === 'normal' ? ' active ok' : ''), 'data-fk': `n-${it.id}`, 'aria-pressed': String(interp === 'normal'), 'aria-label': `${it.label}: normal`, onclick: () => { this.d.interpretations[it.id] = 'normal'; this.render(); } }, '● Normal'),
            h('button', { class: 'chip' + (interp === 'altered' ? ' active bad' : ''), 'data-fk': `a-${it.id}`, 'aria-pressed': String(interp === 'altered'), 'aria-label': `${it.label}: alterado`, onclick: () => { this.d.interpretations[it.id] = 'altered'; this.render(); } }, '▲ Alterado'),
          ) : null,
        );
        return card;
      })));
    }
    const pending = this.d.examined.filter((id) => !this.d.interpretations[id]).length;
    this.main.append(
      h('h2', null, 'B. Exame físico'),
      h('p', { class: 'muted small' }, 'Avalie os parâmetros e classifique cada achado como normal ou alterado. Os valores de referência variam conforme espécie, idade e contexto.'),
      h('div', { class: 'case-actions top' }, h('button', { class: 'btn small', onclick: () => openVetiDexEntry('fisio_parametros_vitais') }, '📖 Consultar VetiDex: parâmetros vitais')),
      wrap,
      h('div', { class: 'case-actions' },
        h('button', { class: 'btn', onclick: () => this.go('anamnesis') }, '← Anamnese'),
        pending ? h('span', { class: 'small warn' }, `${pending} item(ns) avaliado(s) sem interpretação`) : null,
        h('button', { class: 'btn btn-primary', disabled: this.d.examined.length === 0, onclick: () => this.go('tests') }, 'Seguir → Exames complementares'),
      ),
    );
  }

  // ------------------------------------------------------------ C. Exames complementares
  private renderTests(): void {
    const c = this.c;
    const list = h('div', { class: 'tests' }, ...c.tests.items.map((t) => {
      const done = this.d.requestedTests.includes(t.id);
      return h('div', { class: 'test card' + (done ? ' done' : '') },
        h('div', { class: 'test-head' },
          h('strong', null, t.name),
          h('span', { class: 'small muted' }, `R$ ${t.cost} • ${t.turnaround}`),
          done ? h('span', { class: 'badge ok' }, 'Solicitado') : h('button', {
            class: 'btn small', onclick: () => this.requestTest(t.id),
          }, 'Solicitar'),
        ),
        done ? h('div', { class: 'test-result' },
          h('p', null, t.result),
          t.table ? h('table', { class: 'lab' }, h('thead', null, h('tr', null, h('th', null, 'Parâmetro'), h('th', null, 'Resultado'), h('th', null, 'Referência'), h('th', null, ''))),
            h('tbody', null, ...t.table.map((r) => h('tr', { class: r.flag ? 'flag' : '' }, h('td', null, r.param), h('td', null, r.value), h('td', null, r.ref), h('td', { class: 'flagcell' }, r.flag === 'H' ? '↑' : r.flag === 'L' ? '↓' : r.flag === 'A' ? '!' : ''))))) : null,
        ) : null,
      );
    }));
    this.main.append(
      h('h2', null, 'C. Exames complementares'),
      h('p', { class: 'muted small' }, 'Solicite apenas exames que ajudem a confirmar ou descartar hipóteses ou que mudem a conduta. Cada exame tem custo, tempo de resposta e justificativa — exames desnecessários reduzem a nota. A justificativa de cada exame aparece no relatório final.'),
      list,
      h('div', { class: 'case-actions' },
        h('button', { class: 'btn', onclick: () => this.go('physicalExam') }, '← Exame físico'),
        h('button', { class: 'btn btn-primary', onclick: () => this.go('diagnosis') }, this.d.requestedTests.length ? 'Seguir → Diagnóstico' : 'Não solicitar exames → Diagnóstico'),
      ),
    );
  }

  private requestTest(id: string): void {
    const t = this.c.tests.items.find((x) => x.id === id)!;
    if (t.requires && !t.requires.every((r) => this.d.requestedTests.includes(r))) {
      this.warnings.push(`${t.name}: ${t.requiresMessage}`);
      app.audio.sfx('error');
    } else app.audio.sfx('confirm');
    this.d.requestedTests.push(id);
    this.render();
  }

  // ------------------------------------------------------------ D. Diagnóstico
  private renderDiagnosis(): void {
    const dx = this.c.diagnosis;
    const found = collectedFindings(this.c, this.d);
    const diffBox = h('div', { class: 'chips' }, ...dx.hypotheses.map((hy) => {
      const on = this.d.differentials.includes(hy.id);
      return h('button', {
        class: 'chip big' + (on ? ' active' : ''), 'aria-pressed': String(on),
        onclick: () => {
          if (on) {
            this.d.differentials = this.d.differentials.filter((x) => x !== hy.id);
            if (this.d.finalDiagnosis === hy.id) this.d.finalDiagnosis = null;
          } else if (this.d.differentials.length < dx.maxDifferentials) this.d.differentials.push(hy.id);
          else { app.audio.sfx('error'); return; }
          app.audio.sfx('select');
          this.render();
        },
      }, hy.name);
    }));
    const finalBox = h('div', { class: 'radio-list' }, ...(this.d.differentials.length ? this.d.differentials.map((id) => {
      const hy = dx.hypotheses.find((x) => x.id === id)!;
      return h('label', { class: 'radio' + (this.d.finalDiagnosis === id ? ' active' : '') },
        h('input', { type: 'radio', name: 'final', checked: this.d.finalDiagnosis === id, onchange: () => { this.d.finalDiagnosis = id; this.render(); } }), hy.name);
    }) : [h('p', { class: 'muted small' }, 'Selecione primeiro os diagnósticos diferenciais.')]));
    const evBox = h('div', { class: 'check-list' }, ...(found.length ? found.map((fid) => {
      const f = this.c.findings.find((x) => x.id === fid)!;
      const on = this.d.evidence.includes(fid);
      return h('label', { class: 'check' + (on ? ' active' : '') },
        h('input', { type: 'checkbox', checked: on, onchange: () => { this.d.evidence = on ? this.d.evidence.filter((x) => x !== fid) : [...this.d.evidence, fid]; this.render(); } }), f.label);
    }) : [h('p', { class: 'muted small' }, 'Nenhum achado coletado. Volte às etapas anteriores para investigar.')]));
    const ok = this.d.differentials.length >= dx.minDifferentials && !!this.d.finalDiagnosis && this.d.evidence.length > 0;
    this.main.append(
      h('h2', null, 'D. Raciocínio diagnóstico'),
      h('h3', null, `1. Lista de diagnósticos diferenciais (${this.d.differentials.length}/${dx.maxDifferentials}, mínimo ${dx.minDifferentials})`),
      diffBox,
      h('h3', null, '2. Diagnóstico mais provável'),
      finalBox,
      h('h3', null, '3. Justificativa: quais achados sustentam o diagnóstico escolhido?'),
      h('p', { class: 'muted small' }, 'Só aparecem achados que você realmente obteve. Escolha os que sustentam o diagnóstico — achados irrelevantes reduzem a nota.'),
      evBox,
      h('div', { class: 'case-actions' },
        h('button', { class: 'btn', onclick: () => this.go('tests') }, '← Exames'),
        h('button', { class: 'btn btn-primary', disabled: !ok, onclick: () => this.go('conduct') }, 'Confirmar → Conduta'),
      ),
    );
  }

  // ------------------------------------------------------------ E. Conduta
  private renderConduct(): void {
    const opts = this.c.conduct.options;
    const list = h('div', { class: 'conduct-list' }, ...opts.map((o) => {
      const on = this.d.conduct.includes(o.id);
      const pharm = o.pharmacology ? h('details', { class: 'pharm' },
        h('summary', null, '💊 Consultar farmacologia educacional'),
        h('dl', null,
          h('dt', null, 'Classe'), h('dd', null, o.pharmacology.drugClass),
          h('dt', null, 'Mecanismo de ação'), h('dd', null, o.pharmacology.mechanism),
          h('dt', null, 'Indicações'), h('dd', null, o.pharmacology.indications),
          h('dt', null, 'Contraindicações e precauções'), h('dd', null, o.pharmacology.contraindications),
          h('dt', null, 'Princípios de escolha'), h('dd', null, o.pharmacology.principles)),
        h('p', { class: 'small muted' }, 'Doses e prescrições não são apresentadas: são responsabilidade do médico-veterinário.')) : null;
      const card = h('div', { class: 'conduct card' + (on ? ' active' : '') },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on, onchange: () => { this.d.conduct = on ? this.d.conduct.filter((x) => x !== o.id) : [...this.d.conduct, o.id]; app.audio.sfx('select'); this.render(); } }),
          h('span', null, h('span', { class: 'type-badge' }, TYPE_LABELS[o.type] ?? o.type), ' ', o.text)),
        pharm,
      );
      return card;
    }));
    this.main.append(
      h('h2', null, 'E. Conduta'),
      h('p', { class: 'muted small' }, 'Selecione todas as condutas que você proporia à supervisora. Considere o paciente, os contactantes, o ambiente e a segurança de cada espécie. Procedimentos são realizados pela equipe sob supervisão.'),
      list,
      h('div', { class: 'case-actions' },
        h('button', { class: 'btn', onclick: () => this.go('diagnosis') }, '← Diagnóstico'),
        h('button', { class: 'btn btn-primary', disabled: this.d.conduct.length === 0, onclick: () => void this.submit() }, 'Finalizar atendimento → Resultado'),
      ),
    );
  }

  private async submit(): Promise<void> {
    if (!(await askConfirm('Finalizar o atendimento e ver o resultado? As decisões não poderão ser alteradas.', 'Finalizar'))) return;
    const report = scoreCase(this.c, this.d);
    const { xp } = requireState().recordClinicalCase(this.c, report);
    this.report = report;
    (this.report as ScoreReport & { xp?: number }).xp = xp;
    app.audio.sfx(report.outcome === 'critical' ? 'error' : report.passed ? 'success' : 'cancel');
    this.go('result');
  }

  // ------------------------------------------------------------ F. Resultado
  private renderResult(): void {
    const r = this.report!;
    const c = this.c;
    const xp = (r as ScoreReport & { xp?: number }).xp ?? 0;
    const correct = c.diagnosis.hypotheses.find((x) => x.id === c.diagnosis.correctId)!;
    const outcomeText = c.outcome[r.outcome];
    const icon = { good: '✔', bad: '✘', neutral: '•', critical: '⚠' };
    const chosenPharm = c.conduct.options.filter((o) => o.pharmacology && this.d.conduct.includes(o.id));
    this.main.append(
      h('div', { class: 'result-head ' + r.outcome },
        h('div', { class: 'score-ring' }, h('div', { class: 'score-num' }, String(r.total)), h('div', { class: 'score-of' }, '/100')),
        h('div', null,
          h('h2', null, r.outcome === 'critical' ? 'Decisão crítica identificada' : r.passed ? 'Atendimento aprovado!' : 'Atendimento abaixo da meta'),
          h('p', null, outcomeText),
          h('p', { class: 'small' }, `+${xp} XP • Meta: ${c.passScore} pontos • Tempo clínico: ${r.minutes} min${r.budgetMinutes ? ` (${c.clinicalTime?.urgent ? 'meta' : 'referência'}: ${r.budgetMinutes} min)` : ''} • Custo dos exames: R$ ${r.totalCost}${r.capped ? ` • Nota limitada a 50 por decisão crítica (nota bruta: ${r.rawTotal})` : ''}`),
        ),
      ),
      h('div', { class: 'card' },
        h('h3', null, `Diagnóstico provável: ${correct.name}`),
        h('p', null, c.diagnosis.explanation),
        h('h3', null, 'Conduta recomendada'),
        h('p', null, c.conduct.explanation),
      ),
      h('h3', null, 'Pontuação por etapa'),
      ...r.sections.map((s) => h('details', { class: 'section-report', open: s.score / s.max < 0.7 },
        h('summary', null, h('span', { class: 'sec-name' }, s.label), h('span', { class: 'sec-score' }, `${s.score.toLocaleString('pt-BR')} / ${s.max}`),
          h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: `width:${(s.score / s.max) * 100}%;background:${s.score / s.max < 0.7 ? 'var(--warn)' : 'var(--accent)'}` }))),
        h('ul', { class: 'feedback' }, ...s.feedback.map((f) => h('li', { class: f.kind }, h('span', { class: 'fb-icon' }, icon[f.kind]), h('div', null, h('div', null, f.text), f.explanation ? h('div', { class: 'small muted' }, f.explanation) : null)))),
      )),
      ...(chosenPharm.length ? [h('div', { class: 'card' }, h('h3', null, '💊 Farmacologia das condutas escolhidas'), ...chosenPharm.map((o) => h('div', { class: 'pharm-sum' },
        h('strong', null, o.pharmacology!.drugClass), h('p', { class: 'small' }, `Mecanismo: ${o.pharmacology!.mechanism}`), h('p', { class: 'small' }, `Contraindicações/precauções: ${o.pharmacology!.contraindications}`))))] : []),
      h('div', { class: 'card' },
        h('h3', null, '📚 Conteúdos para revisão'),
        r.reviewTopics.length ? h('ul', null, ...r.reviewTopics.map((t) => h('li', null, t.title, t.vetidexId && VETIDEX_MAP[t.vetidexId] ? h('button', { class: 'link', onclick: () => openVetiDexEntry(t.vetidexId!) }, ` → VetiDex: ${VETIDEX_MAP[t.vetidexId].name}`) : null))) : h('p', null, 'Excelente! Nenhuma etapa abaixo de 70%.'),
        r.triggeredReviewQuestions.length ? h('p', { class: 'small' }, `${r.triggeredReviewQuestions.length} pergunta(s) foram agendadas na revisão espaçada (Estação de Revisão da biblioteca ou painel de Desempenho).`) : null,
      ),
      h('div', { class: 'card refs-card' },
        h('h3', null, 'Fontes para verificação'),
        h('ol', { class: 'refs' }, ...c.references.map((ref) => h('li', null, REFERENCE_MAP[ref.refId]?.citation ?? ref.refId, h('div', { class: 'small muted' }, `Sustenta: ${ref.supports}`)))),
        h('p', { class: 'disclaimer' }, `${c.educationalNotice} Status de validação: ${c.validation.status}.`),
      ),
      h('div', { class: 'case-actions' }, h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => this.finish() }, 'Concluir e voltar ao hospital')),
    );
  }
}
