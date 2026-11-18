/**
 * Entrada unificada (teclado + controles de toque) com ações remapeáveis.
 * A cena do mundo consulta o estado; a interface recebe eventos de ação.
 */
import { DEFAULT_KEYBINDS } from './SaveManager';

export type Action = keyof typeof DEFAULT_KEYBINDS;
export const ACTION_LABELS: Record<Action, string> = {
  up: 'Mover para cima', down: 'Mover para baixo', left: 'Mover para a esquerda', right: 'Mover para a direita',
  interact: 'Interagir / confirmar', menu: 'Menu', inventory: 'Inventário', map: 'Mapa', vetidex: 'VetiDex',
  journal: 'Diário de missões', performance: 'Desempenho', run: 'Correr',
};

type Listener = (action: Action, e?: KeyboardEvent) => void;

export function keyLabel(code: string): string {
  const map: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espaço', Enter: 'Enter', Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift Dir.' };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export class InputManager {
  private held = new Set<Action>();
  private dirOrder: Action[] = [];
  /** última direção tocada (garante que toques rápidos virem o personagem) */
  private tapped: 'up' | 'down' | 'left' | 'right' | null = null;
  private listeners = new Set<Listener>();
  private codeToActions = new Map<string, Action[]>();
  /** quando definido, a próxima tecla é capturada para remapeamento */
  private captureCb: ((code: string) => void) | null = null;

  constructor(private binds: Record<string, string[]>) {
    this.rebuild();
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => { this.held.clear(); this.dirOrder = []; });
  }

  setBinds(binds: Record<string, string[]>) { this.binds = binds; this.rebuild(); }
  getBinds() { return this.binds; }

  private rebuild() {
    this.codeToActions.clear();
    for (const [action, codes] of Object.entries(this.binds)) {
      for (const c of codes) {
        const list = this.codeToActions.get(c) ?? [];
        list.push(action as Action);
        this.codeToActions.set(c, list);
      }
    }
  }

  captureNextKey(cb: (code: string) => void) { this.captureCb = cb; }

  private isTyping(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (this.captureCb) {
      e.preventDefault();
      const cb = this.captureCb;
      this.captureCb = null;
      cb(e.code);
      return;
    }
    if (this.isTyping(e)) return;
    const actions = this.codeToActions.get(e.code);
    if (!actions) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    for (const a of actions) {
      if (e.repeat && this.held.has(a)) continue;
      this.press(a, e);
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const actions = this.codeToActions.get(e.code);
    if (!actions) return;
    for (const a of actions) {
      // só solta se nenhuma outra tecla do mesmo comando estiver pressionada (simplificação: solta)
      this.release(a);
    }
  }

  press(a: Action, e?: KeyboardEvent) {
    const was = this.held.has(a);
    this.held.add(a);
    if (['up', 'down', 'left', 'right'].includes(a)) {
      this.dirOrder = this.dirOrder.filter((d) => d !== a);
      this.dirOrder.push(a);
      this.tapped = a as 'up';
    }
    if (!was) this.listeners.forEach((l) => l(a, e));
  }

  release(a: Action) {
    this.held.delete(a);
    this.dirOrder = this.dirOrder.filter((d) => d !== a);
  }

  isHeld(a: Action): boolean { return this.held.has(a); }

  /** direção mais recente ainda pressionada */
  direction(): 'up' | 'down' | 'left' | 'right' | null {
    for (let i = this.dirOrder.length - 1; i >= 0; i--) if (this.held.has(this.dirOrder[i])) return this.dirOrder[i] as 'up';
    return null;
  }

  /** Consome a última direção tocada (mesmo que já solta). */
  consumeTap(): 'up' | 'down' | 'left' | 'right' | null {
    const t = this.tapped;
    this.tapped = null;
    return t;
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  clearHeld() { this.held.clear(); this.dirOrder = []; this.tapped = null; }
}
