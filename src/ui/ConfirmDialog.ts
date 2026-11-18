/**
 * Confirmação dentro do jogo (substitui window.confirm, que alguns visualizadores bloqueiam).
 */
import { app } from '../core/context';
import { h } from './dom';
import { ui } from './UIManager';

export function askConfirm(message: string, okLabel = 'Confirmar', cancelLabel = 'Cancelar'): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: boolean) => {
      if (done) return;
      done = true;
      ui().close(modal);
      app.audio.sfx(v ? 'confirm' : 'cancel');
      resolve(v);
    };
    const el = h('div', { class: 'overlay confirm-overlay' }, h('div', { class: 'panel confirm-box', role: 'alertdialog', 'aria-label': 'Confirmação' },
      h('p', null, message),
      h('div', { class: 'menu-footer' },
        h('button', { class: 'btn', onclick: () => finish(false) }, cancelLabel),
        h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => finish(true) }, okLabel),
      ),
    ));
    const modal = ui().open({ el, onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}
