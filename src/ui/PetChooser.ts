/**
 * Adoção de pets: escolha da espécie, da raça (com prévia animada e ficha educativa) e do nome.
 */
import { app, requireState } from '../core/context';
import { BREEDS, BREED_MAP, MAX_PETS, PET_SPECIES, type Breed } from '../content/pets';
import { REFERENCE_MAP } from '../content';
import { buildPetSheet, PET_FRAMES, PET_H, PET_W } from '../art/pets';
import { h, clear, frameCanvas } from './dom';
import { ui } from './UIManager';

const NAME_SUGGESTIONS = ['Mel', 'Luna', 'Bento', 'Nina', 'Fubá', 'Biscoito', 'Amora', 'Tapioca', 'Cacau', 'Paçoquinha', 'Jabuticaba', 'Quindim', 'Bolota', 'Pitanga'];

const sheetCache = new Map<string, HTMLCanvasElement>();
export function petSheet(breedId: string): HTMLCanvasElement {
  if (!sheetCache.has(breedId)) sheetCache.set(breedId, buildPetSheet(BREED_MAP[breedId].look));
  return sheetCache.get(breedId)!;
}
const thumbCache = new Map<string, string>();
export function petThumb(breedId: string): string {
  if (!thumbCache.has(breedId)) thumbCache.set(breedId, frameCanvas(petSheet(breedId), PET_W, PET_H, 0).toDataURL());
  return thumbCache.get(breedId)!;
}

/** Canvas animado (anda e para) para prévias. Retorna o elemento e uma função para parar. */
export function animatedPet(breedId: string, scale = 5): { el: HTMLCanvasElement; stop: () => void } {
  const el = h('canvas', { class: 'pixel pet-anim', width: String(PET_W), height: String(PET_H), style: `width:${PET_W * scale}px;height:${PET_H * scale}px` }) as HTMLCanvasElement;
  const ctx = el.getContext('2d')!;
  const sheet = petSheet(breedId);
  const seq = [1, 2, 1, 2, 1, 2, 0, 0, 3, 0, 3, 0];
  let i = 0;
  const draw = () => { ctx.clearRect(0, 0, PET_W, PET_H); ctx.drawImage(sheet, (seq[i % seq.length] % PET_FRAMES) * PET_W, 0, PET_W, PET_H, 0, 0, PET_W, PET_H); i++; };
  draw();
  const t = window.setInterval(draw, 160);
  return { el, stop: () => window.clearInterval(t) };
}

export function breedCard(b: Breed): HTMLElement {
  return h('div', { class: 'pet-facts' },
    h('div', { class: 'dex-block sci' }, h('div', { class: 'dex-label' }, '🔬 Você sabia?'), h('p', null, b.fact)),
    h('div', { class: 'dex-block did' }, h('div', { class: 'dex-label' }, '🏡 Cuidados'), h('p', null, b.care)),
    h('ol', { class: 'refs' }, ...b.refs.map((r) => h('li', null, REFERENCE_MAP[r]?.citation ?? r))),
    h('p', { class: 'disclaimer' }, 'Predisposição não é destino: indica maior frequência relatada, não que todo animal terá a doença. Conteúdo educacional pendente de validação.'),
  );
}

export function openPetChooser(onDone?: (adopted: boolean) => void): void {
  const st = requireState();
  if (st.data.pets.owned.length >= MAX_PETS) {
    const el = h('div', { class: 'overlay' }, h('div', { class: 'panel confirm-box' },
      h('p', null, `Você já tem ${MAX_PETS} pets. Cuidar bem de cada um também é responsabilidade!`),
      h('div', { class: 'menu-footer' }, h('button', { class: 'btn btn-primary', autofocus: true, onclick: () => ui().close(m) }, 'Entendi'))));
    const m = ui().open({ el, onClose: () => onDone?.(false) });
    return;
  }
  let species = PET_SPECIES[0].id;
  let selected: string = BREEDS.find((b) => b.species === species)!.id;
  let adopted = false;
  let stopAnim: (() => void) | null = null;
  const tabs = h('div', { class: 'chips pet-tabs' });
  const grid = h('div', { class: 'pet-grid' });
  const detail = h('div', { class: 'pet-detail' });
  const nameInput = h('input', { id: 'pet-name', type: 'text', maxlength: '14', class: 'name-input', 'aria-label': 'Nome do pet', value: NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)] }) as HTMLInputElement;
  const err = h('div', { class: 'small bad' });
  const adoptBtn = h('button', { class: 'btn btn-primary' }, 'Adotar');

  const renderTabs = () => {
    clear(tabs);
    for (const s of PET_SPECIES) tabs.appendChild(h('button', { class: 'chip big' + (s.id === species ? ' active' : ''), onclick: () => { species = s.id; selected = BREEDS.find((b) => b.species === species)!.id; app.audio.sfx('select'); renderAll(); } }, `${s.icon} ${s.name}`));
  };
  const renderGrid = () => {
    clear(grid);
    for (const b of BREEDS.filter((x) => x.species === species)) {
      grid.appendChild(h('button', { class: 'pet-cell' + (b.id === selected ? ' active' : ''), 'aria-pressed': String(b.id === selected), onclick: () => { selected = b.id; app.audio.sfx('select'); renderGrid(); renderDetail(); } },
        h('img', { src: petThumb(b.id), class: 'pixel', alt: '' }), h('span', null, b.name.replace(/ \(.*\)$/, ''))));
    }
  };
  const renderDetail = () => {
    stopAnim?.();
    clear(detail);
    const b = BREED_MAP[selected];
    const anim = animatedPet(b.id, 5);
    stopAnim = anim.stop;
    detail.append(
      h('div', { class: 'pet-stage' }, anim.el),
      h('h3', null, b.name),
      breedCard(b),
    );
    adoptBtn.textContent = `Adotar ${nameInput.value.trim() || 'pet'}`;
  };
  const renderAll = () => { renderTabs(); renderGrid(); renderDetail(); };
  nameInput.addEventListener('input', () => { err.textContent = ''; adoptBtn.textContent = `Adotar ${nameInput.value.trim() || 'pet'}`; });
  adoptBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name.length < 2) { err.textContent = 'Dê um nome com pelo menos 2 letras.'; app.audio.sfx('error'); return; }
    if (st.adoptPet(selected, name)) { adopted = true; app.audio.sfx('success'); ui().close(modal); }
  });

  const el = h('div', { class: 'overlay' }, h('div', { class: 'panel pet-chooser', role: 'dialog', 'aria-label': 'Adoção de pet' },
    h('h2', null, '🐾 Adoção responsável'),
    h('p', { class: 'muted small' }, 'Escolha um companheiro para acompanhar sua jornada. Adotar é um compromisso para toda a vida do animal: vacinação, alimentação adequada, castração, identificação e consultas periódicas.'),
    tabs,
    h('div', { class: 'pet-layout' }, grid, detail),
    h('div', { class: 'pet-bottom' },
      h('div', { class: 'pet-name-row' }, h('label', { for: 'pet-name', class: 'field-label' }, 'Nome do pet'), nameInput, err),
      h('div', { class: 'menu-footer' }, h('button', { class: 'btn', onclick: () => ui().close(modal) }, 'Agora não'), adoptBtn),
    ),
  ));
  const modal = ui().open({ el, onAction: (a) => ['up', 'down', 'left', 'right', 'interact'].includes(a), onClose: () => { stopAnim?.(); onDone?.(adopted); } });
  renderAll();
}
