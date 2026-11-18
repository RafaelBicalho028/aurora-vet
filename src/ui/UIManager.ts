/**
 * Gerencia as camadas de interface DOM (HUD, modais, notificações) e o roteamento de teclas.
 */
import { app } from '../core/context';
import type { Action } from '../core/InputManager';
import { h } from './dom';

export interface Modal {
  el: HTMLElement;
  /** retorna true se tratou a ação */
  onAction?: (a: Action) => boolean;
  onClose?: () => void;
  /** não fecha com Esc */
  persistent?: boolean;
}

type HotkeyHandler = (a: Action) => void;

export class UIManager {
  root: HTMLElement;
  hudLayer: HTMLElement;
  modalLayer: HTMLElement;
  toastLayer: HTMLElement;
  private stack: Modal[] = [];
  private hotkeys: HotkeyHandler | null = null;
  /** verdadeiro enquanto a cena do mundo estiver ativa */
  worldActive = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.hudLayer = h('div', { class: 'layer hud-layer' });
    this.modalLayer = h('div', { class: 'layer modal-layer' });
    this.toastLayer = h('div', { class: 'layer toast-layer', 'aria-live': 'polite' });
    root.append(this.hudLayer, this.modalLayer, this.toastLayer);
    app.input.on((a) => this.route(a));
  }

  setHotkeys(handler: HotkeyHandler | null): void { this.hotkeys = handler; }

  isBlocking(): boolean { return this.stack.length > 0; }
  top(): Modal | undefined { return this.stack[this.stack.length - 1]; }

  open(m: Modal): Modal {
    this.stack.push(m);
    this.modalLayer.appendChild(m.el);
    document.body.classList.add('modal-open');
    app.input.clearHeld();
    requestAnimationFrame(() => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches;
      const f = m.el.querySelector<HTMLElement>(coarse ? 'button[autofocus], button' : '[autofocus], button, [tabindex="0"]');
      // em celulares, não focar campos de texto automaticamente (evita abrir o teclado)
      if (!(coarse && f && (f.tagName === 'INPUT' || f.tagName === 'TEXTAREA'))) f?.focus({ preventScroll: true });
    });
    return m;
  }

  close(m?: Modal): void {
    const target = m ?? this.top();
    if (!target) return;
    const i = this.stack.indexOf(target);
    if (i < 0) return;
    this.stack.splice(i, 1);
    target.el.remove();
    if (!this.stack.length) document.body.classList.remove('modal-open');
    target.onClose?.();
    app.input.clearHeld();
  }

  closeAll(): void { while (this.stack.length) this.close(); }

  private route(a: Action): void {
    const t = this.top();
    if (t) {
      if (t.onAction?.(a)) return;
      if (a === 'menu' && !t.persistent) { app.audio.sfx('cancel'); this.close(t); }
      return;
    }
    if (this.worldActive) this.hotkeys?.(a);
  }
}

let instance: UIManager | null = null;
export function ui(): UIManager {
  if (!instance) instance = new UIManager(document.getElementById('ui')!);
  return instance;
}
