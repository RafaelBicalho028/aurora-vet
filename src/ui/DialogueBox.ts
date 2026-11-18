/**
 * Caixa de diálogo com retrato expressivo, efeito de digitação e escolhas.
 */
import { app, requireState } from '../core/context';
import { DIALOGUES } from '../content/dialogues';
import { NPCS } from '../content/npcs';
import { buildPortrait, lookFromAppearance, type CharacterLook, type Expression } from '../art/characters';
import type { DialogueChoice, Effect } from '../systems/dialogue/types';
import { h, pixelImg } from './dom';
import { ui, type Modal } from './UIManager';

const UI_EFFECTS = new Set(['startCase', 'startMinigame', 'startQuiz', 'adoptPet', 'openReview', 'openPanel']);

function speakerInfo(speaker: string | undefined, fallbackNpc?: string): { name: string; look: CharacterLook | null } {
  const id = speaker ?? fallbackNpc;
  if (!id || id === 'narrador') return { name: '', look: null };
  if (id === 'player') {
    const st = requireState();
    return { name: st.data.player.name, look: lookFromAppearance(st.data.player.appearance) };
  }
  const npc = NPCS.find((n) => n.id === id);
  if (npc) return { name: npc.name, look: npc.look };
  return { name: id, look: null };
}

const portraitCache = new Map<string, string>();
function portraitSrc(id: string, look: CharacterLook, expr: Expression): string {
  const k = `${id}:${expr}`;
  if (!portraitCache.has(k)) portraitCache.set(k, buildPortrait(look, expr).toDataURL());
  return portraitCache.get(k)!;
}

function charDelay(): number {
  return { lenta: 40, normal: 22, rapida: 8 }[app.settings.textSpeed] ?? 22;
}

class DialogueView {
  el: HTMLElement;
  private portrait: HTMLImageElement;
  private portraitBox: HTMLElement;
  private nameEl: HTMLElement;
  private textEl: HTMLElement;
  private choicesEl: HTMLElement;
  private more: HTMLElement;
  private typing = false;
  private full = '';
  private timer: number | null = null;
  private resolver: ((v: number) => void) | null = null;
  private choices: DialogueChoice[] = [];
  private sel = 0;
  modal: Modal;

  constructor() {
    this.portrait = h('img', { class: 'pixel portrait-img', alt: '' });
    this.portraitBox = h('div', { class: 'portrait' }, this.portrait);
    this.nameEl = h('div', { class: 'dlg-name' });
    this.textEl = h('p', { class: 'dlg-text' });
    this.choicesEl = h('div', { class: 'dlg-choices', role: 'listbox' });
    this.more = h('div', { class: 'dlg-more' }, '▼');
    const box = h('div', { class: 'dialogue panel', role: 'dialog', 'aria-live': 'polite' },
      this.portraitBox,
      h('div', { class: 'dlg-body' }, this.nameEl, this.textEl, this.choicesEl),
      this.more,
    );
    box.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.dlg-choice')) return;
      this.advance();
    });
    this.el = h('div', { class: 'dialogue-wrap' }, box);
    this.modal = { el: this.el, persistent: true, onAction: (a) => this.onAction(a) };
  }

  private onAction(a: string): boolean {
    if (a === 'interact') { this.advance(); return true; }
    if (this.choices.length && !this.typing) {
      if (a === 'up' || a === 'left') { this.select((this.sel - 1 + this.choices.length) % this.choices.length); return true; }
      if (a === 'down' || a === 'right') { this.select((this.sel + 1) % this.choices.length); return true; }
    }
    return true; // bloqueia demais teclas
  }

  private select(i: number) {
    this.sel = i;
    app.audio.sfx('select');
    [...this.choicesEl.children].forEach((c, idx) => c.classList.toggle('selected', idx === i));
  }

  private advance() {
    if (this.typing) {
      this.finishTyping();
      return;
    }
    if (this.choices.length) {
      this.pick(this.sel);
      return;
    }
    app.audio.sfx('blip');
    this.resolver?.(-1);
  }

  private pick(i: number) {
    const c = this.choices[i];
    if (c.correct === true) app.audio.sfx('confirm');
    else if (c.correct === false) app.audio.sfx('error');
    else app.audio.sfx('confirm');
    this.resolver?.(i);
  }

  private finishTyping() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.typing = false;
    this.textEl.textContent = this.full;
    this.showChoices();
  }

  private showChoices() {
    this.choicesEl.innerHTML = '';
    this.more.style.visibility = this.choices.length ? 'hidden' : 'visible';
    this.choices.forEach((c, i) => {
      const b = h('button', { class: 'dlg-choice' + (i === this.sel ? ' selected' : ''), role: 'option' }, c.text);
      b.addEventListener('click', (e) => { e.stopPropagation(); this.sel = i; this.pick(i); });
      b.addEventListener('mouseenter', () => { this.sel = i; [...this.choicesEl.children].forEach((x, idx) => x.classList.toggle('selected', idx === i)); });
      this.choicesEl.appendChild(b);
    });
  }

  show(text: string, speaker: { id?: string; name: string; look: CharacterLook | null }, expression: Expression, choices: DialogueChoice[]): Promise<number> {
    this.nameEl.textContent = speaker.name;
    this.nameEl.style.display = speaker.name ? '' : 'none';
    if (speaker.look && speaker.id) {
      this.portrait.src = portraitSrc(speaker.id, speaker.look, expression);
      this.portraitBox.style.display = '';
    } else {
      this.portraitBox.style.display = 'none';
    }
    this.full = text;
    this.choices = choices;
    this.sel = 0;
    this.choicesEl.innerHTML = '';
    this.more.style.visibility = 'hidden';
    this.textEl.textContent = '';
    this.typing = true;
    let i = 0;
    const d = charDelay();
    this.timer = window.setInterval(() => {
      i += 1;
      this.textEl.textContent = this.full.slice(0, i);
      if (i % 3 === 0) app.audio.sfx('blip');
      if (i >= this.full.length) this.finishTyping();
    }, d);
    return new Promise((res) => { this.resolver = res; });
  }
}

let active = false;
export function dialogueActive(): boolean { return active; }

function splitEffects(effects: Effect[] | undefined): [Effect[], Effect[]] {
  const now: Effect[] = [], later: Effect[] = [];
  for (const e of effects ?? []) (UI_EFFECTS.has(e.type) ? later : now).push(e);
  return [now, later];
}

/** Executa um diálogo definido em content/dialogues.ts. */
export async function runDialogue(dialogueId: string, npcId?: string): Promise<void> {
  const def = DIALOGUES[dialogueId];
  const st = requireState();
  if (!def) { console.warn('Diálogo inexistente', dialogueId); return; }
  const entry = def.entries.find((e) => st.check(e.when));
  if (!entry) return;
  const view = new DialogueView();
  active = true;
  ui().open(view.modal);
  const deferred: Effect[] = [];
  let nodeId: string | undefined = entry.start;
  let guard = 0;
  try {
    while (nodeId && guard++ < 200) {
      const node: (typeof def.nodes)[string] = def.nodes[nodeId];
      if (!node) break;
      const [now, later] = splitEffects(node.effects);
      st.apply(now, `${dialogueId}.${nodeId}`);
      deferred.push(...later);
      const sp = speakerInfo(node.speaker, npcId);
      const visibleChoices = (node.choices ?? []).filter((c) => st.check(c.when));
      const chosen = await view.show(st.interpolate(node.text), { id: node.speaker ?? npcId, ...sp }, node.expression ?? 'neutro', visibleChoices);
      if (chosen >= 0) {
        const c = visibleChoices[chosen];
        const [cn, cl] = splitEffects(c.effects);
        st.apply(cn, `${dialogueId}.${nodeId}.${chosen}`);
        deferred.push(...cl);
        nodeId = c.next;
      } else {
        nodeId = node.next;
      }
    }
  } finally {
    ui().close(view.modal);
    active = false;
  }
  if (deferred.length) st.apply(deferred);
}

/** Exibe falas simples (placas, objetos, narração) e aplica efeitos ao final. */
export async function showLines(lines: string[], effects?: Effect[], onceKey?: string): Promise<void> {
  const st = requireState();
  const view = new DialogueView();
  active = true;
  ui().open(view.modal);
  try {
    for (const l of lines) await view.show(st.interpolate(l), { name: '', look: null }, 'neutro', []);
  } finally {
    ui().close(view.modal);
    active = false;
  }
  if (effects?.length) {
    const [now, later] = splitEffects(effects);
    st.apply(now, onceKey);
    st.apply(later);
  }
}

export { pixelImg };
