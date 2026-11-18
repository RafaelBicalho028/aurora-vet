/** Painel de configurações (áudio, texto, controles de toque, remapeamento de teclas, dados). */
import { askConfirm } from './ConfirmDialog';
import { app, saveSettings } from '../core/context';
import { ACTION_LABELS, keyLabel, type Action } from '../core/InputManager';
import { DEFAULT_KEYBINDS } from '../core/SaveManager';
import { goToTitle } from '../core/flow';
import { h, clear } from './dom';
import { ui } from './UIManager';
import { toggleFullscreen } from './fullscreen';
import { renderBackupSection } from './BackupPanel';

// ------------------------------------------------------------------ Configurações
export function renderSettingsPanel(inGame: boolean): HTMLElement {
  const s = app.settings;
  const slider = (label: string, value: number, on: (v: number) => void) => {
    const out = h('span', { class: 'slider-val' }, `${Math.round(value * 100)}%`);
    const input = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)), 'aria-label': label }) as HTMLInputElement;
    input.addEventListener('input', () => { out.textContent = `${input.value}%`; on(Number(input.value) / 100); saveSettings(); });
    return h('label', { class: 'setting' }, h('span', null, label), input, out);
  };
  const select = <T extends string>(label: string, value: T, options: [T, string][], on: (v: T) => void) => {
    const sel = h('select', { 'aria-label': label }, ...options.map(([v, l]) => h('option', { value: v, selected: v === value }, l))) as HTMLSelectElement;
    sel.addEventListener('change', () => { on(sel.value as T); saveSettings(); });
    return h('label', { class: 'setting' }, h('span', null, label), sel);
  };
  const binds = h('div', { class: 'binds' });
  const renderBinds = () => {
    clear(binds);
    for (const a of Object.keys(DEFAULT_KEYBINDS) as Action[]) {
      const codes = s.keybinds[a] ?? [];
      const btn = h('button', { class: 'btn small' }, codes.length ? codes.map(keyLabel).join(' / ') : '—');
      btn.addEventListener('click', () => {
        btn.textContent = 'Pressione uma tecla...';
        app.input.captureNextKey((code) => {
          if (code === 'Escape' && a !== 'menu') { renderBinds(); return; }
          // remove o código de outras ações para evitar conflito
          for (const other of Object.keys(s.keybinds)) s.keybinds[other] = s.keybinds[other].filter((c) => c !== code);
          s.keybinds[a] = [code, ...(DEFAULT_KEYBINDS[a].filter((c) => c.startsWith('Arrow')) ?? [])].filter((c, i, arr) => arr.indexOf(c) === i);
          saveSettings();
          renderBinds();
        });
      });
      binds.appendChild(h('div', { class: 'bind-row' }, h('span', null, ACTION_LABELS[a]), btn));
    }
  };
  renderBinds();
  return h('div', { class: 'tab-pane' },
    h('h2', null, 'Configurações'),
    h('section', { class: 'card' },
      h('h3', null, 'Áudio e texto'),
      slider('Música', s.musicVolume, (v) => { s.musicVolume = v; }),
      slider('Efeitos sonoros', s.sfxVolume, (v) => { s.sfxVolume = v; }),
      select('Tamanho do texto', s.textSize, [['normal', 'Normal'], ['grande', 'Grande'], ['muito_grande', 'Muito grande']], (v) => { s.textSize = v; }),
      select('Velocidade do texto', s.textSpeed, [['lenta', 'Lenta'], ['normal', 'Normal'], ['rapida', 'Rápida']], (v) => { s.textSpeed = v; }),
      select('Controles de toque', s.showTouchControls, [['auto', 'Automático'], ['sempre', 'Sempre'], ['nunca', 'Nunca']], (v) => { s.showTouchControls = v; document.querySelectorAll('.touch').forEach((t) => ((t as HTMLElement).style.display = v === 'sempre' || (v === 'auto' && matchMedia('(pointer: coarse)').matches) ? '' : 'none')); }),
      h('button', { class: 'btn', onclick: () => toggleFullscreen() }, '⛶ Alternar tela cheia (F11)'),
    ),
    h('section', { class: 'card' },
      h('h3', null, 'Controles (clique para remapear)'),
      binds,
      h('button', { class: 'btn small', onclick: () => { s.keybinds = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS)); saveSettings(); renderBinds(); } }, 'Restaurar padrão'),
    ),
    renderBackupSection(() => {
      app.state = null;
      ui().closeAll();
      goToTitle();
    }),
    !inGame ? null : h('section', { class: 'card danger' },
      h('h3', null, 'Dados'),
      h('p', { class: 'muted small' }, 'O progresso é salvo automaticamente neste navegador (LocalStorage).'),
      h('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (await askConfirm('Apagar todo o progresso salvo? Esta ação não pode ser desfeita.', 'Apagar')) {
            app.saver.clear();
            app.state = null;
            ui().closeAll();
            goToTitle();
          }
        },
      }, 'Apagar progresso'),
    ),
  );
}

