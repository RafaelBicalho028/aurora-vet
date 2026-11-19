/**
 * HUD (nível, XP, etapa, objetivo atual), notificações e controles de toque.
 */
import { app } from '../core/context';
import { bus, Events } from '../core/EventBus';
import { levelProgress, stageFor } from '../systems/progression/xp';
import type { Action } from '../core/InputManager';
import { h } from './dom';
import { ui } from './UIManager';

export class Hud {
  el: HTMLElement;
  private name = h('div', { class: 'hud-name' });
  private level = h('div', { class: 'hud-level' });
  private xpFill = h('div', { class: 'xp-fill' });
  private xpText = h('div', { class: 'xp-text' });
  private stage = h('div', { class: 'hud-stage' });
  private day = h('div', { class: 'hud-day' });
  private objective = h('div', { class: 'hud-objective' });
  private hint = h('div', { class: 'hud-hint' });
  private location = h('div', { class: 'hud-location' });
  private touch: HTMLElement;
  private offs: (() => void)[] = [];

  constructor(onButton: (a: Action) => void) {
    const card = h('div', { class: 'hud-card panel' },
      h('div', { class: 'hud-row' }, this.name, this.level),
      h('div', { class: 'xp-bar', title: 'Experiência' }, this.xpFill, this.xpText),
      this.stage,
      this.day,
    );
    const objCard = h('div', { class: 'hud-obj panel' }, h('div', { class: 'hud-obj-label' }, 'Objetivo'), this.objective);
    const btns = h('div', { class: 'hud-buttons' },
      ...([['journal', '📜', 'Diário (J)'], ['vetidex', '📖', 'VetiDex (V)'], ['map', '🗺', 'Mapa (M)'], ['menu', '☰', 'Menu (Esc)']] as [Action, string, string][]).map(([a, icon, label]) =>
        h('button', { class: 'hud-btn', title: label, 'aria-label': label, onclick: () => onButton(a) }, icon)),
    );
    this.touch = this.buildTouch();
    this.el = h('div', { class: 'hud' }, card, objCard, btns, this.location, this.hint, this.touch);
    this.refresh();
    this.offs.push(bus.on(Events.StateChanged, () => this.refresh()));
    this.updateTouchVisibility();
  }

  setLocation(name: string): void {
    this.location.textContent = name;
    this.location.classList.remove('show');
    void this.location.offsetWidth;
    this.location.classList.add('show');
  }

  setHint(text: string | null): void {
    this.hint.textContent = text ?? '';
    this.hint.style.display = text ? '' : 'none';
  }

  refresh(): void {
    const st = app.state;
    if (!st) return;
    const p = levelProgress(st.data.totalXp);
    this.name.textContent = st.data.player.name;
    this.level.textContent = `Nv. ${p.level}`;
    this.xpFill.style.width = `${Math.round(p.ratio * 100)}%`;
    this.xpText.textContent = `${p.current}/${p.needed} XP`;
    const storyStage = st.data.flags['etapa2_liberada'] ? 2 : 1;
    this.stage.textContent = `Etapa ${stageFor(p.level, storyStage).id}: ${stageFor(p.level, storyStage).title}`;
    const cal = st.calendar;
    this.day.textContent = `${['☀', '🌤', '🌙'][cal.period]} ${st.dayLabel()}`;
    this.day.title = cal.period === 2 ? 'É noite: volte para casa e durma para começar um novo dia.' : 'Cada atendimento ocupa um período do dia.';
    this.objective.textContent = st.activeObjectiveText() ?? 'Explore o campus e revise conteúdos.';
  }

  /**
   * Controles de toque: direcional analógico (arraste o dedo em qualquer direção, sem precisar
   * levantar), botão A (interagir), B (segurar para correr) e menu.
   */
  private buildTouch(): HTMLElement {
    const mk = (a: Action, label: string, cls: string, title: string) => {
      const b = h('button', { class: `touch-btn ${cls}`, 'aria-label': title }, label);
      const down = (e: PointerEvent) => { e.preventDefault(); app.audio.unlock(); b.classList.add('pressed'); app.input.press(a); try { b.setPointerCapture(e.pointerId); } catch { /* */ } };
      const up = (e: Event) => { e.preventDefault(); b.classList.remove('pressed'); app.input.release(a); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      return b;
    };
    const knob = h('div', { class: 'stick-knob' });
    const pad = h('div', { class: 'stick', role: 'application', 'aria-label': 'Direcional: arraste para mover' }, h('div', { class: 'stick-ring' }), knob);
    let current: Action | null = null;
    let activeId: number | null = null;
    const setDir = (d: Action | null) => {
      if (d === current) return;
      if (current) app.input.release(current);
      current = d;
      if (d) app.input.press(d);
    };
    const update = (e: PointerEvent) => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width / 2;
      const dist = Math.hypot(dx, dy);
      if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
      knob.style.transform = `translate(${dx * 0.55}px, ${dy * 0.55}px)`;
      if (dist < r.width * 0.16) { setDir(null); return; } // zona morta
      setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    const end = () => { activeId = null; knob.style.transform = ''; setDir(null); };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); app.audio.unlock(); activeId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch { /* */ } update(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === activeId) update(e); });
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('lostpointercapture', end);
    return h('div', { class: 'touch' },
      pad,
      h('div', { class: 'abtns' }, mk('interact', 'A', 'ta', 'A: interagir / confirmar'), mk('run', 'B', 'tb', 'B: segurar para correr'), mk('menu', '☰', 'tm', 'Menu')),
    );
  }

  updateTouchVisibility(): void {
    const pref = app.settings.showTouchControls;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const show = pref === 'sempre' || (pref === 'auto' && coarse);
    this.touch.style.display = show ? '' : 'none';
    document.body.classList.toggle('touch-ui', show);
  }

  destroy(): void {
    this.offs.forEach((o) => o());
    this.el.remove();
  }
}

/** Notificações flutuantes (XP, missões, VetiDex, itens). */
export function initToasts(): void {
  const toast = (text: string, kind = 'info', icon = '✦') => {
    const t = h('div', { class: `toast toast-${kind}` }, h('span', { class: 'toast-icon' }, icon), h('span', null, text));
    const layer = ui().toastLayer;
    const existing = layer.querySelectorAll('.toast');
    if (existing.length >= 4) existing[0].remove();
    layer.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  };
  bus.on(Events.Toast, (p: { text: string; kind?: string; icon?: string }) => toast(p.text, p.kind, p.icon));
  bus.on(Events.XpGained, (p: { amount: number; reason: string }) => toast(`+${p.amount} XP — ${p.reason}`, 'xp', '★'));
  bus.on(Events.LevelUp, (p: { level: number }) => { app.audio.sfx('levelup'); toast(`Nível ${p.level} alcançado!`, 'level', '▲'); });
  bus.on(Events.QuestUpdated, (p: { started?: boolean; title?: string; objective?: string }) => {
    if (p.started) { app.audio.sfx('page'); toast(`Nova missão: ${p.title}`, 'quest', '📜'); }
    else if (p.objective) toast(`Objetivo concluído: ${p.objective}`, 'quest', '✔');
  });
  bus.on(Events.QuestCompleted, (p: { title: string }) => { app.audio.sfx('success'); toast(`Missão concluída: ${p.title}`, 'level', '🏅'); });
  bus.on(Events.DexUnlocked, (p: { names: string[] }) => {
    app.audio.sfx('unlock');
    const n = p.names.length;
    toast(n === 1 ? `VetiDex: ${p.names[0]}` : `VetiDex: ${n} novas entradas`, 'dex', '📖');
  });
  bus.on(Events.ItemGained, (p: { name: string }) => toast(`Item recebido: ${p.name}`, 'item', '🎒'));
  bus.on(Events.Saved, () => {
    const s = document.querySelector('.save-indicator');
    if (s) { s.classList.remove('show'); void (s as HTMLElement).offsetWidth; s.classList.add('show'); }
  });
  ui().toastLayer.appendChild(h('div', { class: 'save-indicator' }, '💾 Progresso salvo'));
}
