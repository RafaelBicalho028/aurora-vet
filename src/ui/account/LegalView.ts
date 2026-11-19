/** Leitura dos documentos legais (Termos de Uso, Política de Privacidade e aviso educacional). */
import { h } from '../dom';
import { ui } from '../UIManager';
import { LEGAL_DOCS, type LegalDocument } from '../../content/legal';

export function renderLegal(doc: LegalDocument): HTMLElement {
  return h('article', { class: 'legal-doc' },
    h('h2', null, doc.title),
    ...(doc.intro ?? []).map((p) => h('p', { class: 'muted small' }, p)),
    ...doc.sections.flatMap((s) => [
      s.heading ? h('h3', null, s.heading) : null,
      ...(s.paragraphs ?? []).map((p) => h('p', null, p)),
      s.bullets ? h('ul', null, ...s.bullets.map((b) => h('li', null, b))) : null,
      s.table ? h('div', { class: 'legal-table-wrap' }, h('table', { class: 'legal-table' },
        h('thead', null, h('tr', null, ...s.table.head.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', null, ...s.table.rows.map((r) => h('tr', null, ...r.map((c) => h('td', null, c))))))) : null,
    ]),
  );
}

/** Abre um documento numa janela própria, sobre a tela atual. */
export function openLegal(id: keyof typeof LEGAL_DOCS): void {
  const doc = LEGAL_DOCS[id];
  const close = h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(m) }, 'Fechar');
  const el = h('div', { class: 'overlay' }, h('div', { class: 'panel acc-legal', role: 'dialog', 'aria-modal': 'true', 'aria-label': doc.title },
    h('div', { class: 'acc-legal-body', tabindex: '0' }, renderLegal(doc)),
    h('div', { class: 'menu-footer' }, close),
  ));
  const m = ui().open({ el });
}
