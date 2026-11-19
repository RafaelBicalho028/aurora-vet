/**
 * Tela inicial (Continuar / Novo jogo / Configurações / Sobre) e criação de personagem.
 */
import { askConfirm } from './ConfirmDialog';
import { openPetChooser } from './PetChooser';
import { app } from '../core/context';
import { GameState, newSaveData } from '../core/GameState';
import type { Appearance, HairStyle, PatternId, Sex, UniformType } from '../core/types';
import { buildCharacterSheet, FRAME_H, FRAME_W, HAIR_COLORS, HAIR_COLOR_NAMES, HAIR_STYLES, HAIR_STYLE_NAMES, lookFromAppearance, OUTFITS, OUTFIT_NAMES, PATTERNS, PATTERN_COLORS, PATTERN_COLOR_NAMES, PATTERN_NAMES, SEX_NAMES, SKIN_TONES, UNIFORM_COLORS, UNIFORM_COLOR_NAMES } from '../art/characters';
import { levelFromXp } from '../systems/progression/xp';
import { h, clear } from './dom';
import { ui, type Modal } from './UIManager';
import { toggleFullscreen } from './fullscreen';
import { renderSettingsPanel } from './SettingsPanel';
import { REFERENCES } from '../content';
import { account } from '../account';
import { PROFILE_LABEL } from '../account/types';
import { bus } from '../core/EventBus';
import { openAccountPanel } from './account/AccountPanel';

export interface TitleCallbacks {
  onContinue: () => void;
  onNewGame: (state: GameState) => void;
}

export function showTitle(cb: TitleCallbacks): Modal {
  const save = app.saver.load();
  const container = h('div', { class: 'title-screen' });
  const menu = h('div', { class: 'title-menu' });
  const render = () => {
    clear(menu);
    if (save) {
      const lv = levelFromXp(save.totalXp);
      menu.appendChild(h('button', { class: 'btn btn-primary big', autofocus: true, onclick: () => { app.audio.unlock(); app.audio.sfx('confirm'); cb.onContinue(); } },
        '▶ Continuar', h('span', { class: 'btn-sub' }, `${save.player.name} • Nível ${lv} • ${new Date(save.updatedAt).toLocaleString('pt-BR')}`)));
    }
    menu.appendChild(h('button', {
      class: 'btn big' + (save ? '' : ' btn-primary'), autofocus: !save,
      onclick: async () => {
        app.audio.unlock();
        if (save && !(await askConfirm('Iniciar um novo jogo substituirá o progresso salvo. Continuar?', 'Novo jogo'))) return;
        app.audio.sfx('confirm');
        openCreator(cb.onNewGame);
      },
    }, '✚ Novo jogo'));
    menu.appendChild(h('button', { class: 'btn', onclick: () => { app.audio.unlock(); openAccountPanel(); } }, '👤 Minha Conta'));
    menu.appendChild(h('button', { class: 'btn', onclick: () => { app.audio.unlock(); openSettings(); } }, save ? '⚙ Configurações e backup' : '⚙ Configurações / ⇪ Restaurar progresso'));
    menu.appendChild(h('button', { class: 'btn', onclick: () => { app.audio.unlock(); toggleFullscreen(); } }, '⛶ Tela cheia'));
    menu.appendChild(h('button', { class: 'btn', onclick: () => { app.audio.unlock(); openAbout(); } }, 'ℹ Sobre o Aurora Vet'));
  };
  render();
  const acc = account();
  const greeting = acc?.profile ? h('div', { class: 'acc-greeting' },
    h('span', null, `Olá, ${acc.profile.username}`),
    h('span', { class: 'small muted' }, PROFILE_LABEL[acc.profile.professional_profile]),
    h('button', { class: 'link-btn small', onclick: async () => {
      if (!(await askConfirm('Sair da conta neste aparelho? Seu progresso fica salvo na conta.', 'Sair'))) return;
      await acc.signOut();
      bus.emit('account:signedOut');
    } }, 'Sair')) : null;
  if (greeting) container.append(greeting);
  container.append(
    h('div', { class: 'logo' },
      h('div', { class: 'logo-mark' }, '✚'),
      h('h1', null, 'Aurora Vet'),
      h('div', { class: 'logo-sub' }, 'Jornada Veterinária'),
    ),
    menu,
    h('div', { class: 'title-foot' }, 'RPG educacional para estudantes de Medicina Veterinária • Conteúdo educacional pendente de validação técnica • v0.7'),
  );
  const modal = ui().open({ el: container, persistent: true, onAction: () => false });
  container.addEventListener('pointerdown', () => { app.audio.unlock(); app.audio.play('title'); }, { once: true });
  container.addEventListener('keydown', () => { app.audio.unlock(); app.audio.play('title'); }, { once: true });
  return modal;
}

function openSettings(): void {
  const el = h('div', { class: 'overlay' }, h('div', { class: 'menu panel narrow' }, renderSettingsPanel(false), h('div', { class: 'menu-footer' }, h('button', { class: 'btn btn-primary', onclick: () => ui().close(m) }, 'Fechar'))));
  const m = ui().open({ el });
}

export function openAbout(): void {
  const el = h('div', { class: 'overlay' }, h('div', { class: 'menu panel narrow about' },
    h('h2', null, 'Sobre o Aurora Vet'),
    h('p', null, 'Aurora Vet: Jornada Veterinária é um RPG educacional que transforma conteúdos da graduação em Medicina Veterinária em exploração, atendimentos supervisionados e raciocínio clínico.'),
    h('h3', null, 'Aviso educacional'),
    h('ul', null,
      h('li', null, 'Todo o conteúdo clínico é material educacional simplificado e está pendente de validação por médico(a)-veterinário(a).'),
      h('li', null, 'O jogo não apresenta doses nem prescrições. Decisões terapêuticas reais cabem ao médico-veterinário responsável.'),
      h('li', null, 'Níveis e etapas representam progresso no jogo, não habilitação profissional.'),
      h('li', null, 'Personagens, mapas, arte e músicas são originais.'),
    ),
    h('h3', null, 'Referências utilizadas como base'),
    h('ol', { class: 'refs' }, ...REFERENCES.map((r) => h('li', null, r.citation))),
    h('div', { class: 'menu-footer' }, h('button', { class: 'btn btn-primary', onclick: () => ui().close(m) }, 'Fechar')),
  ));
  const m = ui().open({ el });
}

// ------------------------------------------------------------------ Criação de personagem
function openCreator(onDone: (s: GameState) => void): void {
  const a: Appearance = { skin: 1, hairColor: 1, hairStyle: 'curto', uniform: 'jaleco', uniformColor: 0, glasses: false, sex: 'feminino', pattern: 'liso', patternColor: 0 };
  let name = (account()?.profile?.username ?? '').replace(/[._\d]+/g, ' ').trim().slice(0, 14);
  const preview = h('canvas', { class: 'pixel creator-preview', width: String(FRAME_W), height: String(FRAME_H), 'aria-label': 'Prévia do personagem' }) as HTMLCanvasElement;
  const pctx = preview.getContext('2d')!;
  let sheet = buildCharacterSheet(lookFromAppearance(a));
  let frame = 0;
  const order = [0, 1, 0, 2, 3, 4, 3, 5, 9, 10, 9, 11, 6, 7, 6, 8];
  const anim = window.setInterval(() => {
    frame = (frame + 1) % order.length;
    pctx.clearRect(0, 0, FRAME_W, FRAME_H);
    pctx.drawImage(sheet, order[frame] * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
  }, 220);
  const update = () => { sheet = buildCharacterSheet(lookFromAppearance(a)); };

  const swatches = <T,>(label: string, values: T[], current: () => T, colorOf: (v: T, i: number) => string, nameOf: (v: T, i: number) => string, set: (v: T) => void) => {
    const row = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': label });
    const paint = () => {
      clear(row);
      values.forEach((v, i) => row.appendChild(h('button', {
        class: 'swatch' + (current() === v ? ' active' : ''), style: `background:${colorOf(v, i)}`, title: nameOf(v, i), 'aria-label': nameOf(v, i), role: 'radio', 'aria-checked': String(current() === v),
        onclick: () => { set(v); update(); paint(); app.audio.sfx('select'); },
      })));
    };
    paint();
    return h('div', { class: 'creator-field' }, h('div', { class: 'field-label' }, label), row);
  };
  const options = <T extends string>(label: string, values: [T, string][], current: () => T, set: (v: T) => void) => {
    const row = h('div', { class: 'chips' });
    const paint = () => {
      clear(row);
      values.forEach(([v, l]) => row.appendChild(h('button', { class: 'chip' + (current() === v ? ' active' : ''), onclick: () => { set(v); update(); paint(); app.audio.sfx('select'); } }, l)));
    };
    paint();
    return h('div', { class: 'creator-field' }, h('div', { class: 'field-label' }, label), row);
  };

  const nameInput = h('input', { type: 'text', maxlength: '14', placeholder: 'Seu nome', class: 'name-input', 'aria-label': 'Nome do personagem', autofocus: true }) as HTMLInputElement;
  const err = h('div', { class: 'small bad' });
  nameInput.value = name;
  nameInput.addEventListener('input', () => { name = nameInput.value; err.textContent = ''; });
  const confirmBtn = h('button', { class: 'btn btn-primary' }, 'Iniciar jornada ▶');
  const submit = () => {
    const n = name.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { err.textContent = 'Digite um nome com pelo menos 2 caracteres.'; app.audio.sfx('error'); nameInput.focus(); return; }
    window.clearInterval(anim);
    ui().close(modal);
    app.saver.clear();
    const state = new GameState(newSaveData(n, { ...a }), app.saver);
    app.state = state;
    // etapa opcional: adotar um companheiro antes de começar
    openPetChooser(() => onDone(state));
  };
  confirmBtn.addEventListener('click', submit);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  const el = h('div', { class: 'overlay' }, h('div', { class: 'creator panel', role: 'dialog', 'aria-label': 'Criação de personagem' },
    h('h2', null, 'Matrícula — Universidade Veterinária de Aurora'),
    h('div', { class: 'creator-layout' },
      h('div', { class: 'creator-preview-box' }, preview, h('div', { class: 'small muted' }, 'Prévia animada')),
      h('div', { class: 'creator-fields' },
        h('div', { class: 'creator-field' }, h('div', { class: 'field-label' }, 'Nome'), nameInput, err),
        options<Sex>('Sexo', [['feminino', SEX_NAMES.feminino], ['masculino', SEX_NAMES.masculino]], () => a.sex ?? 'feminino', (v) => { a.sex = v; }),
        swatches('Tom de pele', SKIN_TONES.map((_, i) => i), () => a.skin, (_, i) => SKIN_TONES[i], (_, i) => `Tom ${i + 1}`, (v) => { a.skin = v; }),
        swatches('Cor do cabelo', HAIR_COLORS.map((_, i) => i), () => a.hairColor, (_, i) => HAIR_COLORS[i], (_, i) => HAIR_COLOR_NAMES[i], (v) => { a.hairColor = v; }),
        options<HairStyle>('Estilo do cabelo', HAIR_STYLES.map((s) => [s, HAIR_STYLE_NAMES[s]]), () => a.hairStyle, (v) => { a.hairStyle = v; }),
        options<UniformType>('Roupa', OUTFITS.map((o) => [o, OUTFIT_NAMES[o]]), () => a.uniform, (v) => { a.uniform = v; }),
        swatches('Cor da roupa', UNIFORM_COLORS.map((_, i) => i), () => a.uniformColor, (_, i) => UNIFORM_COLORS[i], (_, i) => UNIFORM_COLOR_NAMES[i], (v) => { a.uniformColor = v; }),
        options<PatternId>('Estampa', PATTERNS.map((p) => [p, PATTERN_NAMES[p]]), () => a.pattern ?? 'liso', (v) => { a.pattern = v; }),
        swatches('Cor da estampa', PATTERN_COLORS.map((_, i) => i), () => a.patternColor ?? 0, (_, i) => PATTERN_COLORS[i], (_, i) => PATTERN_COLOR_NAMES[i], (v) => { a.patternColor = v; }),
        h('div', { class: 'small muted' }, 'No jaleco, a estampa aparece na roupa por baixo.'),
        options<'nao' | 'sim'>('Óculos', [['nao', 'Sem óculos'], ['sim', 'Com óculos']], () => (a.glasses ? 'sim' : 'nao'), (v) => { a.glasses = v === 'sim'; }),
      ),
    ),
    h('div', { class: 'menu-footer' }, h('button', { class: 'btn', onclick: () => { window.clearInterval(anim); ui().close(modal); } }, 'Voltar'), confirmBtn),
  ));
  const modal = ui().open({ el, onAction: (act) => act === 'interact' || act === 'up' || act === 'down' || act === 'left' || act === 'right', onClose: () => window.clearInterval(anim) });
}
