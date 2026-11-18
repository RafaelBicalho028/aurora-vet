/**
 * Gerador de personagens humanos em pixel art (16x24 por quadro).
 * Folha: 12 quadros em linha — [baixo x3, esquerda x3, direita x3, cima x3]; cada direção: parado, passo A, passo B.
 * Personalização: tom de pele, cor e estilo de cabelo, tipo e cor de uniforme, óculos, barba e chapéu.
 */
import { autoOutline, createCanvas, ctx2d, drawTemplate, OUTLINE, shade, type ColorMap } from './pixel';
import type { Appearance, HairStyle, PatternId, Sex, UniformType } from '../core/types';

export const FRAME_W = 16;
export const FRAME_H = 24;

export const SKIN_TONES = ['#fde0c8', '#f2c4a0', '#d99a66', '#a96a40', '#6f4229'];
export const HAIR_COLORS = ['#2c2333', '#5c3a24', '#9a6634', '#e2bd5e', '#b5462b', '#a9a9b8', '#d8679a', '#4a7fd0'];
export const HAIR_COLOR_NAMES = ['Preto', 'Castanho-escuro', 'Castanho-claro', 'Loiro', 'Ruivo', 'Grisalho', 'Rosa', 'Azul'];
export const UNIFORM_COLORS = ['#3f9d76', '#3d6fb6', '#8c2f45', '#6a4a9c', '#4a5160', '#2a8f99'];
export const UNIFORM_COLOR_NAMES = ['Verde', 'Azul', 'Vinho', 'Roxo', 'Grafite', 'Petróleo'];
export const HAIR_STYLES: HairStyle[] = ['curto', 'raspado', 'chanel', 'longo', 'rabo', 'trancas', 'coque', 'cacheado'];
export const HAIR_STYLE_NAMES: Record<HairStyle, string> = { curto: 'Curto', raspado: 'Raspado', chanel: 'Chanel com franja', longo: 'Longo', rabo: 'Rabo de cavalo', trancas: 'Tranças', coque: 'Coque', cacheado: 'Cacheado' };
export const OUTFITS: UniformType[] = ['jaleco', 'pijama', 'camiseta', 'moletom'];
export const OUTFIT_NAMES: Record<UniformType, string> = { jaleco: 'Jaleco branco', pijama: 'Pijama cirúrgico', camiseta: 'Camiseta e jeans', moletom: 'Moletom da Aurora' };
export const PATTERNS: PatternId[] = ['liso', 'listras', 'xadrez', 'bolinhas', 'coracoes', 'patinhas', 'cruz'];
export const PATTERN_NAMES: Record<PatternId, string> = { liso: 'Liso', listras: 'Listras', xadrez: 'Xadrez', bolinhas: 'Bolinhas', coracoes: 'Corações', patinhas: 'Patinhas', cruz: 'Cruz veterinária' };
export const PATTERN_COLORS = ['#f4f0e6', '#f2cc5a', '#e8566a', '#7cc7f0', '#2c2333', '#8ee0a8'];
export const PATTERN_COLOR_NAMES = ['Branco', 'Amarelo', 'Coral', 'Azul-claro', 'Preto', 'Verde-claro'];
export const SEX_NAMES: Record<Sex, string> = { feminino: 'Feminino', masculino: 'Masculino' };

/** Descrição completa de um personagem para o gerador. */
export interface CharacterLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string; // cor principal do tronco (jaleco branco, pijama, camisa)
  topShade?: string;
  inner: string; // cor que aparece na gola / por baixo
  pants: string;
  shoes: string;
  accent: string | null; // estetoscópio/crachá (null = sem)
  glasses?: boolean;
  beard?: boolean;
  hat?: string | null;
  sex?: Sex;
  pattern?: PatternId;
  patternColor?: string;
  /** onde a estampa aparece: no tronco inteiro ou só na parte interna (jaleco) */
  patternOn?: 'top' | 'inner';
  shortSleeves?: boolean;
  pocket?: boolean;
}

export function lookFromAppearance(a: Appearance): CharacterLook {
  const uniform = UNIFORM_COLORS[a.uniformColor] ?? UNIFORM_COLORS[0];
  const outfit: UniformType = a.uniform ?? 'jaleco';
  const base: CharacterLook = {
    skin: SKIN_TONES[a.skin] ?? SKIN_TONES[1],
    hair: HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0],
    hairStyle: a.hairStyle,
    top: uniform,
    inner: uniform,
    pants: shade(uniform, -0.15),
    shoes: '#ecebe4',
    accent: '#59607a',
    glasses: a.glasses,
    sex: a.sex,
    pattern: a.pattern ?? 'liso',
    patternColor: PATTERN_COLORS[a.patternColor ?? 0] ?? PATTERN_COLORS[0],
    patternOn: 'top',
  };
  switch (outfit) {
    case 'jaleco': return { ...base, top: '#f3f3ec', topShade: '#c3c8d6', pants: '#38405a', shoes: '#3a3038', patternOn: 'inner' };
    case 'camiseta': return { ...base, pants: '#3a5a8a', shoes: '#ecebe4', accent: null, shortSleeves: true };
    case 'moletom': return { ...base, pants: '#3a5a8a', shoes: '#3a3038', accent: null, pocket: true };
    default: return base;
  }
}

// ---------- Templates (sem contorno externo; o contorno é automático) ----------
// Chaves: H cabelo, h sombra do cabelo, L brilho do cabelo, S pele, s sombra da pele, E olhos,
// C tronco, c sombra do tronco, U gola/interno, T acessório, P calça, p sombra calça, B sapatos, O contorno interno.

const HEAD_DOWN = [
  '................',
  '................',
  '.....HHHHHH.....',
  '....HHHLLHHH....',
  '...HHHHHHHHHH...',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HhSSSSSSSShH..',
  '..hSSSSSSSSSSh..',
  '..SSSESSSSESSS..',
  '..SSSESSSSESSS..',
  '..sSSSSSSSSSSs..',
  '...sSSSSSSSSs...',
  '....ssSSSSss....',
];

const HEAD_UP = [
  '................',
  '................',
  '.....HHHHHH.....',
  '....HHHHHHHH....',
  '...HHHHLLHHHH...',
  '...HHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..hHHHHHHHHHHh..',
  '..hHHHHHHHHHHh..',
  '..ShHHHHHHHHhS..',
  '...shhhhhhhhs...',
  '....ssSSSSss....',
];

const HEAD_RIGHT = [
  '................',
  '................',
  '.....HHHHHH.....',
  '...HHHHHHLHH....',
  '..HHHHHHHHHHH...',
  '..HHHHHHHHHHHH..',
  '..HHHHHHHHHHHH..',
  '..HHHHHHhSSSSS..',
  '..HHHHHhSSSSSS..',
  '..hHHHhSSSSESS..',
  '..hHHSsSSSSESSS.',
  '..hhHssSSSSSSS..',
  '...hhhsSSSSSs...',
  '.....ssSSSSs....',
];

const BODY_DOWN = [
  '...CCCCUUCCCC...',
  '..CCCCCUUCCCCC..',
  '.CCcCCTUUTCCcCC.',
  '.CCOcCCTTCCcOCC.',
  '.SSOCCCCCCCCOSS.',
  '.ss.CCCCCCCC.ss.',
  '....cCCCCCCc....',
];
const BODY_DOWN_A = [
  '...CCCCUUCCCC...',
  '..CCCCCUUCCCCC..',
  '.CCcCCTUUTCCcCC.',
  '.SSOcCCTTCCcOCC.',
  '.ssOCCCCCCCCOSS.',
  '....CCCCCCCC.ss.',
  '....cCCCCCCc....',
];
const BODY_DOWN_B = [
  '...CCCCUUCCCC...',
  '..CCCCCUUCCCCC..',
  '.CCcCCTUUTCCcCC.',
  '.CCOcCCTTCCcOSS.',
  '.SSOCCCCCCCCOss.',
  '.ss.CCCCCCCC....',
  '....cCCCCCCc....',
];
const BODY_UP = [
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '.CCcCCCCCCCCcCC.',
  '.CCOcCCCCCCcOCC.',
  '.SSOCCCCCCCCOSS.',
  '.ss.CCCCCCCC.ss.',
  '....cCCCCCCc....',
];
const BODY_UP_A = [
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '.CCcCCCCCCCCcCC.',
  '.SSOcCCCCCCcOCC.',
  '.ssOCCCCCCCCOSS.',
  '....CCCCCCCC.ss.',
  '....cCCCCCCc....',
];
const BODY_UP_B = [
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '.CCcCCCCCCCCcCC.',
  '.CCOcCCCCCCcOSS.',
  '.SSOCCCCCCCCOss.',
  '.ss.CCCCCCCC....',
  '....cCCCCCCc....',
];
const BODY_RIGHT = [
  '.....CCCCCC.....',
  '....CCCCCCCU....',
  '....CCCOcCCU....',
  '....CCCOcCCT....',
  '....CCCSScCC....',
  '....cCCssCCc....',
  '.....cCCCCc.....',
];
const BODY_RIGHT_A = [
  '.....CCCCCC.....',
  '....CCCCCCCU....',
  '....CCOcCCCU....',
  '....CCOcCCCT....',
  '....CSSCCCCC....',
  '....cssCCCCc....',
  '.....cCCCCc.....',
];
const BODY_RIGHT_B = [
  '.....CCCCCC.....',
  '....CCCCCCCU....',
  '....CCCCOcCU....',
  '....CCCCOcCT....',
  '....CCCCCSSC....',
  '....cCCCCssc....',
  '.....cCCCCc.....',
];

const LEGS_FRONT = ['....PPP..PPP....', '....BBB..BBB....', '................'];
const LEGS_FRONT_A = ['....PPP..BBB....', '....BBB.........', '................'];
const LEGS_FRONT_B = ['....BBB..PPP....', '.........BBB....', '................'];
const LEGS_SIDE = ['......PPPp......', '......BBBBB.....', '................'];
const LEGS_SIDE_A = ['.....PP..PP.....', '.....BB..BBB....', '................'];
const LEGS_SIDE_B = ['......pPPP......', '.....BBBBBB.....', '................'];

// Sobreposições de cabelo por estilo e direção (aplicadas por cima).
type Overlay = { rows: string[]; y: number };
const HAIR_OVERLAYS: Record<HairStyle, Record<'down' | 'up' | 'right', Overlay[]>> = {
  curto: { down: [], up: [], right: [] },
  longo: {
    down: [{ y: 7, rows: ['.H............H.', '.HH..........HH.', '.Hh..........hH.', '.Hh..........hH.', '.hh..........hh.', '..h..........h..', '..hh........hh..', '..hh........hh..'] }],
    up: [{ y: 11, rows: ['..HHHHHHHHHHHH..', '...HHHHHHHHHH...', '...hHHHHHHHHh...', '...hHHHHHHHHh...', '....hhhhhhhh....'] }],
    right: [{ y: 9, rows: ['.hHH............', '.hHH............', '.hHHh...........', '.hhHh...........', '..hhh...........', '...hh...........'] }],
  },
  coque: {
    down: [{ y: 0, rows: ['......OOOO......', '.....OHHLHO.....'] }],
    up: [{ y: 0, rows: ['......OOOO......', '.....OHHLHO.....'] }],
    right: [{ y: 1, rows: ['.OOO............', 'OHHHO...........', 'OHhHO...........', '.OO.............'] }],
  },
  raspado: {
    down: [{ y: 2, rows: ['________________', '................', '....hhhhhhhh....', '...hhhhhhhhhh...', '..ShhhhhhhhhhS..', '..SsSSSSSSSSsS..', '..sSSSSSSSSSSs..'] }],
    up: [{ y: 2, rows: ['________________', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..shhhhhhhhhhs..', '..SshhhhhhhhsS..', '...sSSSSSSSSs...'] }],
    right: [{ y: 2, rows: ['________________', '...hhhhhhhhh....', '..hhhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhSSSSS..', '..shhhhSSSSSSS..', '..ShhhsSSSSESS..'] }],
  },
  rabo: {
    down: [{ y: 6, rows: ['..............HH', '..............Hh', '..............hh', '..............h.', '...............h'] }],
    up: [{ y: 11, rows: ['.......RR.......', '.......HH.......', '.......Hh.......', '.......hH.......', '........h.......'] }],
    right: [{ y: 6, rows: ['..R.............', '.HH.............', '.Hh.............', '.hH.............', '.Hh.............', '..h.............'] }],
  },
  trancas: {
    down: [{ y: 8, rows: ['.H............H.', '.h............h.', '.H............H.', '.h............h.', '.H............H.', '.h............h.', '.H............H.', '.R............R.'] }],
    up: [{ y: 11, rows: ['....H......H....', '....h......h....', '....H......H....', '....h......h....', '....H......H....', '....R......R....'] }],
    right: [{ y: 10, rows: ['..H.............', '..h.............', '..H.............', '..h.............', '..H.............', '..R.............'] }],
  },
  chanel: {
    down: [{ y: 7, rows: ['..HHHHHHHHHHHH..', '..HSSSSSSSSSSH..', '..HSSESSSSESSH..', '..HSSESSSSESSH..', '..hsSSSSSSSSsh..', '..hhsSSSSSSshh..'] }],
    up: [{ y: 6, rows: ['..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '..hHHHHHHHHHHh..', '..hhhhhhhhhhhh..'] }],
    right: [{ y: 7, rows: ['..HHHHHHHHHHHS..', '..HHHHHhSSSSSS..', '..HHHHhSSSSESS..', '..HHHHsSSSSESSS.', '..hHHhsSSSSSSS..', '..hhhh.SSSSSs...'] }],
  },
  cacheado: {
    down: [{ y: 1, rows: ['....HH.HH.HH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHH........HHH.', '.HH..........HH.', '.Hh..........hH.', '..h..........h..'] }],
    up: [{ y: 1, rows: ['....HH.HH.HH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HhHHHHHHHHHHhH.', '..hhHHHHHHHHhh..', '...hhhhhhhhhh...'] }],
    right: [{ y: 1, rows: ['....HH.HH.H.....', '..HHHHHHHHHH....', '.HHHHHHHHHHHH...', '.HHHHHHHHHHHHH..', '.HHHHHHHHHHHHH..', '.HHHHHHHHHHHH...', '.HHHHHHH........', '.HHHHHh.........', '.hHHHh..........', '..hhh...........'] }],
  },
};

const GLASSES: Record<'down' | 'right', Overlay> = {
  down: { y: 8, rows: ['....GGG..GGG....', '....GEGGGGEG....', '....GGG..GGG....'] },
  right: { y: 8, rows: ['..........GGG...', '........GGGEG...', '..........GGG...'] },
};
const BEARD: Record<'down' | 'right', Overlay> = {
  down: { y: 11, rows: ['..h..........h..', '...hhhSSSShhh...', '....hhhhhhhh....'] },
  right: { y: 11, rows: ['......hSSSSSh...', '......hhhhhh....', '.......hhhh.....'] },
};
const HATS: Record<'down' | 'up' | 'right', Overlay> = {
  down: { y: 1, rows: ['....KKKKKKKK....', '...KKKKKKKKKK...', '...KkkkkkkkkK...', '.KKKKKKKKKKKKKK.'] },
  up: { y: 1, rows: ['....KKKKKKKK....', '...KKKKKKKKKK...', '...KkkkkkkkkK...', '.KKKKKKKKKKKKKK.'] },
  right: { y: 1, rows: ['....KKKKKKKK....', '...KKKKKKKKKK...', '...KkkkkkkkkK...', '..KKKKKKKKKKKKKK'] },
};

function applyOverlay(base: string[], ov: Overlay): string[] {
  const out = base.slice();
  ov.rows.forEach((row, i) => {
    const y = ov.y + i;
    if (y < 0 || y >= out.length) return;
    const chars = out[y].split('');
    for (let x = 0; x < row.length; x++) if (row[x] === '_') chars[x] = '.'; else if (row[x] !== '.') chars[x] = row[x];
    out[y] = chars.join('');
  });
  return out;
}

type Dir = 'down' | 'up' | 'right';

/** Linhas do quadro (exportado para testes). */
export function frameTemplate(look: CharacterLook, dir: Dir, step: 0 | 1 | 2): string[] {
  const head = dir === 'down' ? HEAD_DOWN : dir === 'up' ? HEAD_UP : HEAD_RIGHT;
  const body =
    dir === 'down' ? [BODY_DOWN, BODY_DOWN_A, BODY_DOWN_B][step]
      : dir === 'up' ? [BODY_UP, BODY_UP_A, BODY_UP_B][step]
        : [BODY_RIGHT, BODY_RIGHT_A, BODY_RIGHT_B][step];
  const legs = dir === 'right' ? [LEGS_SIDE, LEGS_SIDE_A, LEGS_SIDE_B][step] : [LEGS_FRONT, LEGS_FRONT_A, LEGS_FRONT_B][step];
  let rows = [...head, ...body, ...legs]; // 14 + 7 + 3 = 24
  for (const ov of HAIR_OVERLAYS[look.hairStyle][dir]) rows = applyOverlay(rows, ov);
  if (look.hat) rows = applyOverlay(rows, HATS[dir]);
  if (look.beard && dir !== 'up') rows = applyOverlay(rows, BEARD[dir]);
  if (look.sex && dir !== 'up') rows = applyOverlay(rows, SEX_FEATURES[look.sex][dir]);
  if (look.glasses && dir !== 'up') rows = applyOverlay(rows, GLASSES[dir]);
  rows = applyOutfitDetails(rows, look, dir);
  return rows;
}

// Traços sutis: cílios e lábios (feminino) ou sobrancelhas marcadas (masculino).
const SEX_FEATURES: Record<Sex, Record<'down' | 'right', Overlay>> = {
  feminino: {
    down: { y: 9, rows: ['....E......E....', '................', '................', '.......MM.......'] },
    right: { y: 9, rows: ['............E...', '................', '................', '.........M......'] },
  },
  masculino: {
    down: { y: 8, rows: ['....hh....hh....'] },
    right: { y: 8, rows: ['..........hh....'] },
  },
};

/** Estampas: função (x, y) -> pinta? Coordenadas do quadro 16x24; o tronco ocupa as linhas 14–20. */
const PATTERN_FN: Record<PatternId, (x: number, y: number, dir: Dir) => boolean> = {
  liso: () => false,
  listras: (_x, y) => y % 2 === 0,
  xadrez: (x, y) => ((x >> 1) + (y >> 1)) % 2 === 0,
  bolinhas: (x, y) => x % 3 === 1 && (y - 14) % 3 === 1,
  coracoes: (x, y) => {
    const tx = ((x + (Math.floor((y - 14) / 4) % 2) * 2) % 5), ty = (y - 14) % 4;
    return (ty === 0 && (tx === 0 || tx === 2)) || (ty === 1 && tx <= 2) || (ty === 2 && tx === 1);
  },
  patinhas: (x, y) => {
    const tx = ((x + (Math.floor((y - 14) / 3) % 2) * 3) % 6), ty = (y - 14) % 3;
    return (ty === 0 && (tx === 0 || tx === 2)) || (ty === 1 && tx <= 2);
  },
  cruz: (x, y, dir) => {
    if (dir === 'up') return false; // emblema só no peito
    const cx = dir === 'right' ? 8 : 10;
    return (x === cx && y >= 15 && y <= 17) || (y === 16 && x >= cx - 1 && x <= cx + 1);
  },
};

function applyOutfitDetails(rows: string[], look: CharacterLook, dir: Dir): string[] {
  const out = rows.map((r) => r.split(''));
  const pat = PATTERN_FN[look.pattern ?? 'liso'];
  for (let y = 14; y <= 20; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = out[y][x];
      // mangas curtas (camiseta): antebraços à mostra
      if (look.shortSleeves && y === 17 && dir !== 'right' && (x <= 2 || x >= 13) && (ch === 'C' || ch === 'c')) { out[y][x] = 'S'; continue; }
      // bolso canguru (moletom)
      if (look.pocket && y === 19 && x >= 5 && x <= 10 && ch === 'C') { out[y][x] = 'c'; continue; }
      const target = look.patternOn === 'inner' ? ch === 'U' : ch === 'C' || ch === 'c' || ch === 'U' || (ch === 'T' && look.accent === null);
      if (target && pat(x, y, dir)) out[y][x] = ch === 'c' ? 'z' : 'Z';
    }
  }
  return out.map((r) => r.join(''));
}

function colorMap(look: CharacterLook): ColorMap {
  const topShade = look.topShade ?? shade(look.top, -0.2);
  return {
    H: look.hair, h: shade(look.hair, -0.3), L: shade(look.hair, 0.3),
    S: look.skin, s: shade(look.skin, -0.14),
    E: OUTLINE, O: OUTLINE, G: '#3b3346',
    C: look.top, c: topShade,
    U: look.inner, T: look.accent ?? look.top,
    P: look.pants, p: shade(look.pants, -0.25),
    B: look.shoes,
    K: look.hat ?? '#d8b25a', k: shade(look.hat ?? '#d8b25a', -0.25),
    M: '#c4626f', R: '#e8566a',
    Z: look.patternColor ?? '#f4f0e6', z: shade(look.patternColor ?? '#f4f0e6', -0.2),
  };
}

/** Gera a folha de sprites do personagem (192x24). */
export function buildCharacterSheet(look: CharacterLook): HTMLCanvasElement {
  const canvas = createCanvas(FRAME_W * 12, FRAME_H);
  const ctx = ctx2d(canvas);
  const colors = colorMap(look);
  const order: { dir: Dir; mirror: boolean }[] = [
    { dir: 'down', mirror: false },
    { dir: 'right', mirror: true }, // esquerda = direita espelhada
    { dir: 'right', mirror: false },
    { dir: 'up', mirror: false },
  ];
  order.forEach((o, di) => {
    for (const step of [0, 1, 2] as const) {
      const ox = (di * 3 + step) * FRAME_W;
      drawTemplate(ctx, frameTemplate(look, o.dir, step), colors, ox, 0, o.mirror);
      autoOutline(ctx, ox, 0, FRAME_W, FRAME_H);
    }
  });
  return canvas;
}

export type Expression = 'neutro' | 'feliz' | 'preocupado' | 'surpreso';

/** Retrato (cabeça) com expressão, para a caixa de diálogo. 16x16 escalável. */
export function buildPortrait(look: CharacterLook, expression: Expression = 'neutro'): HTMLCanvasElement {
  const canvas = createCanvas(16, 18);
  const ctx = ctx2d(canvas);
  let rows = frameTemplate(look, 'down', 0).slice(0, 17);
  const face: Record<Expression, Overlay[]> = {
    neutro: look.sex === 'feminino' ? [] : [{ y: 12, rows: ['.......ss.......'] }],
    feliz: [{ y: 11, rows: ['......M..M......', '.......MM.......'] }],
    preocupado: [{ y: 8, rows: ['....hh....hh....'] }, { y: 12, rows: ['......MMMM......'] }],
    surpreso: [{ y: 8, rows: ['....h......h....'] }, { y: 11, rows: ['.......MM.......', '.......MM.......'] }],
  };
  for (const ov of face[expression]) rows = applyOverlay(rows, ov);
  const colors = { ...colorMap(look), M: '#8a3b3b' };
  drawTemplate(ctx, rows, colors, 0, 0);
  autoOutline(ctx, 0, 0, 16, 18);
  return canvas;
}
