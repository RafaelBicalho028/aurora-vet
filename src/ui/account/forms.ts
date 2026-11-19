/** Componentes de formulário das telas de conta (acessíveis: rótulos, erros ligados por aria-describedby). */
import { h } from '../dom';
import { PROFESSIONAL_PROFILES, type ProfessionalProfile } from '../../account/types';
import { passwordChecks } from '../../account/validation';

let uid = 0;
const nextId = (p: string) => `${p}-${++uid}`;

export interface FieldHandle {
  wrap: HTMLElement;
  input: HTMLInputElement;
  setError(msg: string | null): void;
  value(): string;
}

export function textField(opts: { label: string; type?: string; name: string; autocomplete?: string; placeholder?: string; hint?: string; value?: string; maxlength?: number }): FieldHandle {
  const id = nextId(opts.name);
  const err = h('div', { class: 'acc-error', id: `${id}-err`, role: 'alert' });
  const hint = opts.hint ? h('div', { class: 'acc-hint', id: `${id}-hint` }, opts.hint) : null;
  const input = h('input', {
    id, name: opts.name, type: opts.type ?? 'text', class: 'acc-input', autocomplete: opts.autocomplete ?? 'off',
    placeholder: opts.placeholder, maxlength: opts.maxlength, spellcheck: 'false', autocapitalize: 'none',
    'aria-describedby': [hint ? `${id}-hint` : '', `${id}-err`].filter(Boolean).join(' '),
  }) as HTMLInputElement;
  if (opts.value) input.value = opts.value;
  const wrap = h('div', { class: 'acc-field' }, h('label', { for: id, class: 'acc-label' }, opts.label), input, hint, err);
  const setError = (msg: string | null) => {
    err.textContent = msg ?? '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    wrap.classList.toggle('has-error', !!msg);
  };
  input.addEventListener('input', () => setError(null));
  return { wrap, input, setError, value: () => input.value };
}

/** Campo de senha com botão mostrar/ocultar e, opcionalmente, lista de requisitos ao vivo. */
export function passwordField(opts: { label: string; name: string; autocomplete: string; withChecklist?: boolean }): FieldHandle {
  const f = textField({ label: opts.label, type: 'password', name: opts.name, autocomplete: opts.autocomplete, maxlength: 72 });
  const toggle = h('button', { type: 'button', class: 'acc-eye', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false' }, '👁');
  toggle.addEventListener('click', () => {
    const show = f.input.type === 'password';
    f.input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
  const row = h('div', { class: 'acc-pass-row' });
  f.input.replaceWith(row);
  row.append(f.input, toggle);
  if (opts.withChecklist) {
    const list = h('ul', { class: 'acc-checklist', 'aria-label': 'Requisitos da senha' });
    const paint = () => {
      list.replaceChildren(...passwordChecks(f.input.value).map((c) => h('li', { class: c.ok ? 'ok' : '' }, `${c.ok ? '✓' : '○'} ${c.label}`)));
    };
    paint();
    f.input.addEventListener('input', paint);
    f.wrap.insertBefore(list, f.wrap.querySelector('.acc-error'));
  }
  return f;
}

export interface CheckHandle { wrap: HTMLElement; input: HTMLInputElement; setError(msg: string | null): void; checked(): boolean }

/** Caixa de seleção — sempre desmarcada por padrão. */
export function checkbox(name: string, ...label: (Node | string)[]): CheckHandle {
  const id = nextId(name);
  const err = h('div', { class: 'acc-error', id: `${id}-err`, role: 'alert' });
  const input = h('input', { type: 'checkbox', id, name, 'aria-describedby': `${id}-err` }) as HTMLInputElement;
  input.checked = false;
  const wrap = h('div', { class: 'acc-check' }, h('label', { for: id }, input, h('span', null, ...label)), err);
  const setError = (msg: string | null) => {
    err.textContent = msg ?? '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    wrap.classList.toggle('has-error', !!msg);
  };
  input.addEventListener('change', () => setError(null));
  return { wrap, input, setError, checked: () => input.checked };
}

export interface ProfileHandle { wrap: HTMLElement; value(): ProfessionalProfile | null; set(v: ProfessionalProfile | null): void; setError(msg: string | null): void }

/** Escolha do perfil profissional em cartões (grupo de rádio). */
export function profileCards(initial: ProfessionalProfile | null = null): ProfileHandle {
  const id = nextId('perfil');
  let current = initial;
  const err = h('div', { class: 'acc-error', id: `${id}-err`, role: 'alert' });
  const cards = PROFESSIONAL_PROFILES.map((p) => {
    const input = h('input', { type: 'radio', name: id, value: p.id, id: `${id}-${p.id}` }) as HTMLInputElement;
    input.checked = p.id === initial;
    input.addEventListener('change', () => { current = p.id; setError(null); });
    return h('label', { class: 'acc-profile', for: `${id}-${p.id}` }, input,
      h('span', { class: 'acc-profile-icon', 'aria-hidden': 'true' }, p.icon),
      h('span', { class: 'acc-profile-text' }, h('strong', null, p.title), h('span', null, p.description)));
  });
  const fieldset = h('fieldset', { class: 'acc-profiles', 'aria-describedby': `${id}-err` },
    h('legend', { class: 'acc-label' }, 'Perfil profissional'), ...cards,
    h('p', { class: 'acc-hint' }, 'Autodeclarado: não exige CRMV nem comprova habilitação profissional. Você pode alterá-lo depois em “Minha Conta”.'),
    err);
  const setError = (msg: string | null) => { err.textContent = msg ?? ''; fieldset.classList.toggle('has-error', !!msg); };
  return {
    wrap: fieldset,
    value: () => current,
    set: (v) => { current = v; cards.forEach((c) => { const i = c.querySelector('input')!; i.checked = i.value === v; }); },
    setError,
  };
}

/** Coloca o botão em estado de carregamento enquanto a ação roda. */
export async function withBusy<T>(btn: HTMLButtonElement, busyLabel: string, fn: () => Promise<T>): Promise<T> {
  const label = btn.textContent;
  btn.disabled = true;
  btn.classList.add('is-busy');
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = busyLabel;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-busy');
    btn.removeAttribute('aria-busy');
    btn.textContent = label;
  }
}

/** Faixa de mensagem (erro, sucesso ou informação) no topo do formulário. */
export function banner(): { el: HTMLElement; show(kind: 'error' | 'success' | 'info', msg: string, extra?: Node): void; hide(): void } {
  const el = h('div', { class: 'acc-banner', role: 'status', 'aria-live': 'polite', hidden: true });
  return {
    el,
    show(kind, msg, extra) {
      el.className = `acc-banner ${kind}`;
      el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
      el.replaceChildren(h('span', null, msg), ...(extra ? [extra] : []));
      el.hidden = false;
    },
    hide() { el.hidden = true; el.replaceChildren(); },
  };
}
