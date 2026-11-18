/**
 * Consulta preventiva do pet do jogador: carteira de saúde, escolha dos cuidados do dia
 * (com alternativas incorretas e perigosas) e uma pergunta sobre a raça.
 */
import { app, requireState } from '../core/context';
import { BREEDS, BREED_MAP } from '../content/pets';
import { CARE_ITEMS } from '../content/petHealth';
import { REFERENCE_MAP } from '../content';
import { careItemsFor, careStatus, distractorsFor, type CareStatus } from '../systems/pets/health';
import { shuffle } from '../systems/questions/bank';
import type { PetRecord } from '../core/types';
import { h, clear } from './dom';
import { ui } from './UIManager';
import { animatedPet } from './PetChooser';

const STATUS_LABEL: Record<CareStatus, string> = { pendente: '⚠ Pendente', vence_logo: '⏰ Vence em breve', em_dia: '✓ Em dia' };

export function healthCard(p: PetRecord, now = Date.now()): HTMLElement {
  const kind = BREED_MAP[p.breed].look.kind;
  return h('ul', { class: 'care-list' }, ...careItemsFor(kind).map((i) => {
    const st = careStatus(i, p.health, now);
    const when = st.dueAt ? ` • próximo: ${new Date(st.dueAt).toLocaleDateString('pt-BR')}` : '';
    return h('li', { class: `care care-${st.status}` }, h('span', { class: 'care-status' }, STATUS_LABEL[st.status]), h('span', null, i.name, h('span', { class: 'small muted' }, when)));
  }));
}

/** Abre a consulta preventiva do pet indicado (ou do companheiro atual). */
export function openPetCheckup(petId?: string): void {
  const st = requireState();
  const pets = st.data.pets.owned;
  if (!pets.length) return;
  let pet = pets.find((p) => p.id === (petId ?? st.data.pets.companion)) ?? pets[0];
  const body = h('div', { class: 'review-body' });
  let stop: (() => void) | null = null;
  const el = h('div', { class: 'overlay' }, h('div', { class: 'panel pet-chooser checkup', role: 'dialog', 'aria-label': 'Consulta preventiva do pet' },
    h('h2', null, '🩺 Consulta preventiva'),
    h('p', { class: 'muted small' }, 'Sob supervisão da Dra. Helena. No jogo, o tempo do pet passa mais rápido: 1 dia real equivale a 1 mês. Intervalos são exemplos didáticos; o protocolo real é definido pelo médico-veterinário.'),
    body,
  ));
  const modal = ui().open({ el, onClose: () => stop?.() });

  const intro = () => {
    clear(body);
    stop?.();
    const b = BREED_MAP[pet.breed];
    const anim = animatedPet(pet.breed, 4);
    stop = anim.stop;
    const picker = pets.length > 1 ? h('div', { class: 'chips' }, ...pets.map((p) => h('button', { class: 'chip' + (p.id === pet.id ? ' active' : ''), onclick: () => { pet = p; intro(); } }, p.name))) : null;
    const due = st.petDue(pet.id);
    if (picker) body.append(picker);
    body.append(
      h('div', { class: 'checkup-head' }, h('div', { class: 'pet-stage' }, anim.el), h('div', null, h('h3', null, pet.name), h('div', { class: 'small muted' }, b.name))),
      h('h4', null, 'Carteira de saúde'),
      healthCard(pet),
      h('p', { class: due.length ? 'note' : 'small ok' }, due.length ? `${due.length} cuidado(s) pendente(s). Vamos decidir o que fazer hoje?` : 'Tudo em dia! Você pode treinar a consulta mesmo assim (sem XP).'),
      h('div', { class: 'case-actions' }, h('button', { class: 'btn', onclick: () => ui().close(modal) }, 'Fechar'), h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => choose() }, 'Iniciar consulta')),
    );
  };

  const choose = () => {
    clear(body);
    const kind = BREED_MAP[pet.breed].look.kind;
    const options = shuffle([
      ...careItemsFor(kind).map((i) => ({ id: i.id, text: i.name })),
      ...distractorsFor(kind).map((d) => ({ id: d.id, text: d.text })),
    ], Math.random);
    const chosen = new Set<string>();
    const list = h('div', { class: 'check-list' }, ...options.map((o) => {
      const input = h('input', { type: 'checkbox', id: `care-${o.id}` }) as HTMLInputElement;
      const label = h('label', { class: 'check', for: `care-${o.id}` }, input, o.text);
      input.addEventListener('change', () => { if (input.checked) chosen.add(o.id); else chosen.delete(o.id); label.classList.toggle('active', input.checked); });
      return label;
    }));
    body.append(
      h('h3', null, `1. O que ${pet.name} precisa hoje?`),
      h('p', { class: 'muted small' }, 'Marque os cuidados indicados para os itens pendentes da carteira. Cuidado: há opções inadequadas e até perigosas.'),
      list,
      h('div', { class: 'case-actions' }, h('button', { class: 'btn btn-primary', onclick: () => breedQuestion([...chosen]) }, 'Próximo')),
    );
  };

  const breedQuestion = (chosen: string[]) => {
    clear(body);
    const b = BREED_MAP[pet.breed];
    const others = shuffle(BREEDS.filter((x) => x.id !== b.id && x.care !== b.care), Math.random).slice(0, 3);
    const opts = shuffle([{ text: b.care, ok: true }, ...others.map((o) => ({ text: o.care, ok: false }))], Math.random);
    const fb = h('div', { class: 'review-feedback' });
    const box = h('div', { class: 'review-options' });
    opts.forEach((o, i) => {
      const btn = h('button', { class: 'btn option' }, o.text);
      btn.addEventListener('click', () => {
        box.querySelectorAll('button').forEach((x, xi) => { (x as HTMLButtonElement).disabled = true; if (opts[xi].ok) x.classList.add('right'); else if (xi === i) x.classList.add('wrong'); });
        app.audio.sfx(o.ok ? 'confirm' : 'error');
        fb.append(h('p', { class: o.ok ? 'ok' : 'bad' }, o.ok ? '✔ Correto!' : '✘ Não é o cuidado mais específico desta raça.'), h('p', null, b.fact), h('button', { class: 'btn btn-primary', onclick: () => result(chosen, o.ok) }, 'Ver resultado'));
        (fb.querySelector('button') as HTMLButtonElement).focus();
      });
      box.appendChild(btn);
    });
    body.append(h('h3', null, `2. Qual cuidado é mais específico para ${b.name}?`), box, fb);
  };

  const result = (chosen: string[], breedOk: boolean) => {
    clear(body);
    const r = st.completeCheckup(pet.id, chosen, breedOk);
    app.audio.sfx(r.critical.length ? 'error' : r.passed ? 'success' : 'cancel');
    const item = (id: string) => CARE_ITEMS.find((i) => i.id === id)!;
    const refs = new Set<string>();
    const li = (kind: string, text: string, why: string, rs: string[]) => { rs.forEach((x) => refs.add(x)); return h('li', { class: kind }, h('span', { class: 'fb-icon' }, kind === 'good' ? '✔' : kind === 'critical' ? '⚠' : '✘'), h('div', null, h('div', null, text), h('div', { class: 'small muted' }, why))); };
    body.append(
      h('div', { class: 'result-head ' + (r.critical.length ? 'critical' : r.passed ? 'success' : 'partial') },
        h('div', { class: 'score-ring' }, h('div', { class: 'score-num' }, String(r.score)), h('div', { class: 'score-of' }, '/100')),
        h('div', null,
          h('h2', null, r.critical.length ? 'Escolha perigosa!' : r.passed ? `${pet.name} está bem cuidado(a)!` : 'Consulta incompleta'),
          h('p', null, r.critical.length ? 'A Dra. Helena interrompe a escolha a tempo: essa conduta poderia causar intoxicação grave. Nenhum cuidado foi registrado.' : `${r.done.length} cuidado(s) registrado(s) na carteira.${r.xp ? ` +${r.xp} XP` : ''}`),
        )),
      h('ul', { class: 'feedback' },
        ...r.done.map((id) => li('good', item(id).name, item(id).why, item(id).refs)),
        ...r.missed.map((id) => li('bad', `Faltou: ${item(id).name}`, item(id).why, item(id).refs)),
        ...r.wrong.map((d) => li('bad', `Inadequado: ${d.text}`, d.why, d.refs)),
        ...r.critical.map((d) => li('critical', `PERIGOSO: ${d.text}`, d.why, d.refs)),
        ...chosen.filter((id) => !r.done.includes(id) && CARE_ITEMS.some((i) => i.id === id)).map((id) => h('li', { class: 'neutral' }, h('span', { class: 'fb-icon' }, '•'), h('div', null, `${item(id).name} — já estava em dia.`))),
      ),
      h('h4', null, 'Carteira atualizada'),
      healthCard(pet),
      h('ol', { class: 'refs' }, ...[...refs].map((x) => h('li', null, REFERENCE_MAP[x]?.citation ?? x))),
      h('div', { class: 'case-actions' }, h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(modal) }, 'Concluir')),
    );
  };

  intro();
}
