/**
 * Backup do progresso: copiar o código de salvamento e restaurar a partir de um código.
 * Funciona sem arquivos (o visualizador de artefatos bloqueia downloads).
 */
import { app } from '../core/context';
import { exportSaveCode } from '../core/SaveManager';
import { h } from './dom';
import { askConfirm } from './ConfirmDialog';

/** Seção de backup. `onRestored` é chamado após restaurar com sucesso. */
export function renderBackupSection(onRestored: () => void): HTMLElement {
  const status = h('p', { class: 'small', role: 'status' });
  const out = h('textarea', { id: 'save-code-out', class: 'code-box', readonly: true, rows: '3', 'aria-label': 'Código de salvamento' }) as HTMLTextAreaElement;
  out.hidden = true;
  const input = h('textarea', { id: 'save-code-in', class: 'code-box', rows: '3', placeholder: 'Cole aqui um código que comece com VQ1-', 'aria-label': 'Colar código de salvamento' }) as HTMLTextAreaElement;

  const copy = h('button', { class: 'btn', type: 'button' }, '📋 Copiar código do meu progresso');
  copy.addEventListener('click', () => {
    if (app.state) app.state.save();
    const data = app.saver.load();
    if (!data) { status.textContent = 'Ainda não há progresso salvo para copiar.'; status.className = 'small bad'; return; }
    const code = exportSaveCode(data);
    out.value = code;
    out.hidden = false;
    const fallback = () => {
      out.focus();
      out.select();
      status.textContent = 'Não foi possível copiar automaticamente: o código está selecionado acima — copie manualmente (Ctrl+C ou "Copiar").';
      status.className = 'small warn';
    };
    try {
      navigator.clipboard.writeText(code).then(() => {
        status.textContent = `Código copiado (${Math.round(code.length / 1024)} KB de texto). Guarde-o num lugar seguro, como um e-mail ou nota para você mesmo(a).`;
        status.className = 'small ok';
        app.audio.sfx('confirm');
      }, fallback);
    } catch { fallback(); }
  });

  const restore = h('button', { class: 'btn btn-primary', type: 'button' }, '⇪ Restaurar a partir do código');
  restore.addEventListener('click', async () => {
    const code = input.value.trim();
    if (!code) { status.textContent = 'Cole um código de salvamento no campo acima.'; status.className = 'small bad'; return; }
    if (app.saver.load() && !(await askConfirm('Restaurar este código vai substituir o progresso atual deste navegador. Continuar?', 'Restaurar'))) return;
    const r = app.saver.importCode(code);
    if (!r.ok) { status.textContent = r.error; status.className = 'small bad'; app.audio.sfx('error'); return; }
    status.textContent = `Progresso de ${r.data.player.name} restaurado!`;
    status.className = 'small ok';
    app.audio.sfx('success');
    onRestored();
  });

  return h('section', { class: 'card' },
    h('h3', null, 'Backup do progresso'),
    h('p', { class: 'muted small' }, 'O progresso fica salvo neste navegador. Para não perder ao trocar de aparelho ou limpar o navegador, copie o código e guarde-o. Para continuar em outro aparelho, cole o código lá.'),
    copy, out,
    h('label', { for: 'save-code-in', class: 'field-label' }, 'Restaurar progresso'),
    input, restore, status,
  );
}
