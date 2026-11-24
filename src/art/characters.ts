/**
 * Gerador de personagens humanos em pixel art (22x28 por quadro, proporção chibi: cabeça grande e olhos expressivos).
 * Folha: 12 quadros em linha — [baixo x3, esquerda x3, direita x3, cima x3]; cada direção: parado, passo A, passo B.
 * Personalização: tom de pele, cor e estilo de cabelo, tipo e cor de uniforme, óculos, barba e chapéu.
 */
import { autoOutline, createCanvas, ctx2d, drawTemplate, OUTLINE, shade, type ColorMap } from './pixel';
import type { Appearance, HairStyle, PatternId, Sex, UniformType } from '../core/types';

export const FRAME_W = 22;
export const FRAME_H = 28;

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
// Quadro 22x28. A maior parte das peças é desenhada numa grade de 20 colunas e posicionada com x = 1;
// peças largas (rabo de cavalo, laço) usam a grade inteira de 22 colunas.
// Chaves: H cabelo, h sombra do cabelo, L brilho do cabelo, d cabelo mais escuro, S pele, s sombra da pele,
// E pálpebra/cílios, I íris, W brilho do olho, C tronco, c sombra do tronco, U gola/interno, T acessório,
// P calça, p sombra da calça, B sapatos, O contorno interno, G óculos, K/k chapéu, M boca, R/r laço,
// Q bochecha rosada, Z/z estampa.

type Dir = 'down' | 'up' | 'right';
type Overlay = { rows: string[]; y: number; x?: number };
type HairPart = { back?: Overlay[]; front?: Overlay[] };

const ROW20 = 20;
const ROW22 = FRAME_W;

/** Peça na grade de 20 colunas (deslocada 1 coluna para dentro do quadro). */
function o20(y: number, rows: string[]): Overlay {
  for (const r of rows) if (r.length !== ROW20) throw new Error(`linha com ${r.length} colunas (esperado ${ROW20}): ${r}`);
  return { y, x: 1, rows };
}
/** Peça na grade inteira de 22 colunas. */
function o22(y: number, rows: string[]): Overlay {
  for (const r of rows) if (r.length !== ROW22) throw new Error(`linha com ${r.length} colunas (esperado ${ROW22}): ${r}`);
  return { y, x: 0, rows };
}

// ---------- Cabeça (pele e olhos) ----------
const FACE: Record<Dir, Overlay> = {
  down: o20(4, [
    '......SSSSSSSS......',
    '.....SSSSSSSSSS.....',
    '....SSSSSSSSSSSS....',
    '...SSSSSSSSSSSSSS...',
    '...SSSSSSSSSSSSSS...',
    '..sSSEESSSSSSEESSs..',
    '..sSSIWSSSSSSIWSSs..',
    '...SSIISSSSSSIISS...',
    '...SSSSSSSSSSSSSS...',
    '....SSSSSSSSSSSS....',
    '.....sSSSSSSSSs.....',
    '........ssss........',
  ]),
  up: o20(4, [
    '......SSSSSSSS......',
    '.....SSSSSSSSSS.....',
    '....SSSSSSSSSSSS....',
    '...SSSSSSSSSSSSSS...',
    '...SSSSSSSSSSSSSS...',
    '..sSSSSSSSSSSSSSSs..',
    '..sSSSSSSSSSSSSSSs..',
    '...SSSSSSSSSSSSSS...',
    '...SSSSSSSSSSSSSS...',
    '....SSSSSSSSSSSS....',
    '.....sSSSSSSSSs.....',
    '........ssss........',
  ]),
  right: o20(4, [
    '......SSSSSSSS......',
    '.....SSSSSSSSSS.....',
    '....SSSSSSSSSSSS....',
    '...SSSSSSSSSSSSSS...',
    '...SSSSSSSSSSSSSS...',
    '...SSSSSssSSSEESS...',
    '...SSSSSssSSSIWSSS..',
    '...SSSSSSSSSSIISS...',
    '...SSSSSSSSSSSSSS...',
    '....SSSSSSSSSSSSS...',
    '.....sSSSSSSSSSs....',
    '........ssss........',
  ]),
};

// ---------- Cabelo ----------
const CAP_DOWN = o20(1, [
  '.......HHHHHH.......',
  '.....HHHHLLHHHH.....',
  '....HHHLLHHHHHHH....',
  '...HHHLHHHHHHHHHh...',
  '..hHHHHHHHHHHHHHHh..',
  '..hHHHHHHHHHHHHHHh..',
]);
const CAP_UP = o20(1, [
  '.......HHHHHH.......',
  '.....HHHHLLHHHH.....',
  '....HHHLLHHHHHHH....',
  '...HHHLHHHHHHHHHh...',
  '..hHHHHHHHHHHHHHHh..',
  '..hHHHHHHHHHHHHHHh..',
  '..hHHHHHHHHHHHHHHh..',
  '..hHHHHHHhHHHHHHHh..',
  '..hHHHHHHhHHHHHHHh..',
  '..hhHHHHHhHHHHHHhh..',
  '...hhHHHhhhHHHHhh...',
  '....hhhh.hh.hhhh....',
]);
const CAP_RIGHT = o20(1, [
  '......HHHHHH........',
  '....HHHHLLLHHH......',
  '...HHHHLLHHHHHH.....',
  '..HHHHHLHHHHHHHH....',
  '..hHHHHHHHHHHHHHH...',
  '..hHHHHHHHHHHHHHHh..',
]);

// franjas (vista de frente) e nuca (vista de lado)
const BANGS_SWEPT = o20(7, [
  '..hHHHHHHHHh...HHh..',
  '..hHHhHHh.......Hh..',
  '..hHh...........hh..',
  '..hh............hh..',
  '..h..............h..',
]);
const BANGS_SPIKY = o20(7, [
  '..hHh.hHH.hHHh.hHh..',
  '..h....h....h....h..',
  '..h..............h..',
]);
const BANGS_BLUNT = o20(7, [
  '.hHHHHHHHHHHHHHHHHh.',
  '.hhdhhhhhhhhhhhhdhh.',
  '.hHh............hHh.',
  '.hHh............hHh.',
  '.hHh............hHh.',
  '.hHh............hHh.',
  '.hhh............hhh.',
  '..hh............hh..',
]);
const SIDE_SWEPT = o20(7, [
  '..hHHHHHHHHHHhHHHh..',
  '..hHHHHHHHhHh..h.h..',
  '..hHHHHh............',
  '..hhHHh.............',
  '...hhh..............',
]);
const SIDE_SPIKY = o20(7, [
  '..hHHHHHHHHh.hH.hh..',
  '..hHHHHHHh..h...h...',
  '..hHHHHh............',
  '..hhHHh.............',
  '...hhh..............',
]);
const SIDE_BLUNT = o20(7, [
  '..hHHHHHHHHHHHHHHh..',
  '..hHHHHHHhhhhhhhh...',
  '..hHHHHHh...........',
  '..hHHHHHh...........',
  '..hHHHHHh...........',
  '..hHHHHHh...........',
  '..hhhhhhh...........',
]);

const HAIR: Record<HairStyle, Record<Dir, HairPart>> = {
  curto: {
    down: { front: [CAP_DOWN, o20(0, ['.......H...H........', '......HHH.HHHH.H....', '.....HHHHHHHHHHH....']), o20(4, ['..H..............H..', '.hHH............HHh.', '.hH..............Hh.']), BANGS_SPIKY] },
    up: { front: [CAP_UP, o20(0, ['.......H...H........', '......HHH.HHHH.H....', '.....HHHHHHHHHHH....']), o20(4, ['..H..............H..', '.hHH............HHh.', '.hH..............Hh.'])] },
    right: { front: [CAP_RIGHT, o20(0, ['......H...H.........', '.....HHH.HHHH.......', '....HHHHHHHHHH......']), o20(4, ['.H..................', 'hHH.................', 'hH..................']), SIDE_SPIKY] },
  },
  raspado: {
    down: { front: [o20(3, [
      '.......hhhhhh.......',
      '.....hhhhhhhhhh.....',
      '....hhhLhhhhhhhh....',
      '...hhhhhhhhhhhhhh...',
      '...hh..........hh...',
      '...h............h...',
    ])] },
    up: { front: [o20(3, [
      '.......hhhhhh.......',
      '.....hhhhhhhhhh.....',
      '....hhhLhhhhhhhh....',
      '...hhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhhh...',
      '...hhhhhhhhhhhhhh...',
      '....hhhhhhhhhhhh....',
    ])] },
    right: { front: [o20(3, [
      '......hhhhhhh.......',
      '....hhhhLhhhhhh.....',
      '...hhhhhhhhhhhhh....',
      '...hhhhhhhhhhhhhh...',
      '...hhhhhhhh.....h...',
      '...hhhhhh...........',
      '...hhhhh............',
      '...hhhh.............',
      '....hh..............',
    ])] },
  },
  chanel: {
    down: { back: [o20(5, ['.hHHHHHHHHHHHHHHHHh.', '.hHHHHHHHHHHHHHHHHh.', '.hHHHHHHHHHHHHHHHHh.'])], front: [CAP_DOWN, BANGS_BLUNT] },
    up: { front: [CAP_UP, o20(5, [
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHhHHHHHHHHh.',
      '.hHHHHHHHhHHHHHHHHh.',
      '.hHHHHHHHhHHHHHHHHh.',
      '.hHHHHHHhhhHHHHHHHh.',
      '.hhhhhhhhhhhhhhhhhh.',
      '..hhdhhhhhhhhhhdhh..',
    ])] },
    right: { front: [CAP_RIGHT, SIDE_BLUNT] },
  },
  longo: {
    down: { back: [o20(5, [
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHH..........HHHh.',
      '.hHHh..........hHHh.',
      '.hHHh..........hHHh.',
      '.hHh............hHh.',
      '..hh............hh..',
    ])], front: [CAP_DOWN, BANGS_SWEPT, o20(11, ['.hHh............hHh.', '.hHh............hHh.', '.hHh............hHh.'])] },
    up: { front: [CAP_UP, o20(5, [
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHHHHHHHHHHHh.',
      '.hHHHHHHhHHHHHHHHHh.',
      '.hHHHHHHhHHHHHHHHHh.',
      '.hHHHHHHhHHHHHHHHHh.',
      '..hHHHHHhHHHHHHHHh..',
      '..hHHHHHhHHHHhHHHh..',
      '..hHHHHhHHHHHhHHHh..',
      '..hHHHHhHHHHHhHHHh..',
      '..hHHHHhHHHHHhHHHh..',
      '...hHHHhHHHHHhHHh...',
      '...hHHHhHHHHhHHHh...',
      '....hhh.hhhh.hhh....',
    ])] },
    right: { back: [o20(7, [
      '.hHHHHHH............',
      '.hHHHHHH............',
      '.hHHHHHH............',
      '.hHHHHHH............',
      '.hHHHHHH............',
      '.hHHHHHh............',
      '.hHHHHHh............',
      '.hHHHHh.............',
      '.hHHHHh.............',
      '.hHHHh..............',
      '.hHHHh..............',
      '..hHh...............',
      '..hhh...............',
      '...h................',
    ])], front: [CAP_RIGHT, SIDE_SWEPT] },
  },
  rabo: {
    down: { back: [o22(2, [
      '................HHH...',
      '...............HHHHh..',
      '................HHLHh.',
      '..................HHh.',
      '..................HLh.',
      '..................HHh.',
      '..................HHh.',
      '..................hHh.',
      '..................hHh.',
      '...................Hh.',
      '...................Hh.',
      '...................hh.',
      '..................hh..',
      '..................h...',
    ])], front: [CAP_DOWN, BANGS_SWEPT, o22(4, ['................dd....'])] },
    up: { back: [o22(2, [
      '...HHH................',
      '..hHHHH...............',
      '.hHLHH................',
      '.hHH..................',
      '.hLH..................',
      '.hHH..................',
      '.hHH..................',
      '.hHh..................',
      '.hHh..................',
      '.hH...................',
      '.hH...................',
      '.hh...................',
      '..hh..................',
      '...h..................',
    ])], front: [CAP_UP, o22(4, ['....dd................'])] },
    right: { back: [o22(2, [
      '...HH.................',
      '.hHHHH................',
      '.hHLH.................',
      '.hHH..................',
      '.hHH..................',
      '.hLH..................',
      '.hHH..................',
      '.hHh..................',
      '.hHh..................',
      '..hH..................',
      '..hH..................',
      '..hh..................',
      '...h..................',
    ])], front: [CAP_RIGHT, SIDE_SWEPT, o22(3, ['....d.................'])] },
  },
  trancas: {
    down: { front: [CAP_DOWN, BANGS_SWEPT, o20(11, [
      '.HL..............HL.',
      '.HH..............HH.',
      '.hh..............hh.',
      '.HL..............HL.',
      '.HH..............HH.',
      '.hh..............hh.',
      '.HL..............HL.',
      '.HH..............HH.',
      '.dd..............dd.',
      '.HL..............HL.',
      '..h..............h..',
    ])] },
    up: { front: [CAP_UP, o20(12, [
      '....HL........HL....',
      '....HH........HH....',
      '....hh........hh....',
      '....HL........HL....',
      '....HH........HH....',
      '....hh........hh....',
      '....HL........HL....',
      '....dd........dd....',
      '....hh........hh....',
      '.....h........h.....',
    ])] },
    right: { front: [CAP_RIGHT, SIDE_SWEPT, o20(11, [
      '......HL............',
      '......HH............',
      '......hh............',
      '......HL............',
      '......HH............',
      '......hh............',
      '......HL............',
      '......dd............',
      '......hh............',
      '.......h............',
    ])] },
  },
  coque: {
    down: { front: [CAP_DOWN, o20(0, ['........HHHH........', '.......HHLLHh.......', '.......hHHHHh.......', '.....HHhhhhhhHH.....']), BANGS_SWEPT] },
    up: { front: [CAP_UP, o20(0, ['........HHHH........', '.......HHLLHh.......', '.......hHHHHh.......', '.....HHhhhhhhHH.....'])] },
    right: { front: [CAP_RIGHT, o20(0, ['...HHHH.............', '..HHLLHh............', '..hHHHHh............', '...hhhhHH...........']), SIDE_SWEPT] },
  },
  cacheado: {
    down: { back: [o20(4, ['.hHHHHHHHHHHHHHHHHh.', 'hHHHHHHHHHHHHHHHHHHh', 'hHHLHHHHHHHHHHHLHHHh', 'hHHHHHHHHHHHHHHHHHHh', 'hHHHHHHHHHHHHHHHHHHh', 'hHHHHHHHHHHHHHHHHHHh', 'hHLHHHHHHHHHHHHHLHHh', '.hHHHHHHHHHHHHHHHHh.', '.hhHH..........HHhh.', '..hh............hh..'])],
      front: [o20(1, [
        '......HHH.HHH.......',
        '....HHHLHHHLHHHH....',
        '...HHLHHHLHHHHLHH...',
        '..HHHHHHHHHHHHHHHH..',
        '.HHLHHHhHHLHHHhHHHh.',
        '.hHHHhHHHHHhHHHHHHh.',
        '.hHHh.hHH.hHH.hHHHh.',
        '.hHh....h....h..hHh.',
      ])] },
    up: { front: [o20(1, [
      '......HHH.HHH.......',
      '....HHHLHHHLHHHH....',
      '...HHLHHHLHHHHLHH...',
      '..HHHHHHHHHHHHHHHH..',
      '.HHLHHHhHHLHHHhHHHh.',
      'hHHHHhHHHHHhHHHHHHHh',
      'hHHLHHHHHHHHHHHLHHHh',
      'hHHHHHHHhHHHHHHHHHHh',
      'hHHHHHHhHHHHHhHHHHHh',
      'hHLHHHHHHHHHHHHHLHHh',
      '.hHHHHhHHHHHHhHHHHh.',
      '.hhHHHHHHhHHHHHHhh..',
      '..hhhhh.hhhh.hhhh...',
    ])] },
    right: { front: [o20(1, [
      '.....HHH.HHH........',
      '...HHHLHHHLHHH......',
      '..HHLHHHHLHHHHH.....',
      '.HHHHHHHHHHHHHHH....',
      '.HHLHHHhHHLHHHHHH...',
      'hHHHHhHHHHHHhHHhHh..',
      'hHHLHHHHHHHh.hH.h...',
      'hHHHHHHHh...........',
      'hHLHHHHh............',
      '.hHHHHh.............',
      '.hhHHh..............',
      '..hhh...............',
    ])] },
  },
};

// ---------- Corpo ----------
// Linhas 16–26 (11 linhas). Masculino: ombros largos, braços afastados. Feminino: ombros estreitos,
// cintura fina e barra da roupa abrindo no quadril.
const BODY: Record<'feminino' | 'masculino', Record<'down' | 'right', string[]>> = {
  masculino: {
    down: [
      '....CCCCCUUCCCCC....',
      '...CCCCCCUUCCCCCC...',
      '..CCcCCCCUUCCCCcCC..',
      '..CCOCCCTUUTCCCOCC..',
      '..CCOCCCCUUCCCCOCC..',
      '..cCOcCCCCCCCCcOCc..',
      '..SS.cCCCCCCCCc.SS..',
      '.....cccccccccc.....',
      '......PPPPPPPP......',
      '......PPp..pPP......',
      '.....BBBB..BBBB.....',
    ],
    right: [
      '......CCCCCCC.......',
      '......CCCCCCCU......',
      '......CcCCCCCU......',
      '......CcOCCOCU......',
      '......CcOCCOCT......',
      '......ccOCCOcc......',
      '......cc.SS.cc......',
      '......cccccccc......',
      '.......PPPPP........',
      '.......PPPPp........',
      '.......BBBBBB.......',
    ],
  },
  feminino: {
    down: [
      '......CCCUUCCC......',
      '.....CCCCUUCCCC.....',
      '....CCcCCUUCCcCC....',
      '....CCOCTUUTCOCC....',
      '....CCOCCUUCCOCC....',
      '....cCOcCCCCcOCc....',
      '....SS.cCCCCc.SS....',
      '.....cCCCCCCCCc.....',
      '......cccccccc......',
      '.......PP..PP.......',
      '......BBB..BBB......',
    ],
    right: [
      '.......CCCCC........',
      '.......CCCCCU.......',
      '.......cCCCCU.......',
      '.......cOCCOU.......',
      '.......cOCCOT.......',
      '.......cOCCOc.......',
      '.......c.SS.c.......',
      '......cCCCCCCc......',
      '......cccccccc......',
      '........PPP.........',
      '........BBBB........',
    ],
  },
};
// pernas ao andar (linhas 24–26 do quadro, ou 25–26 no feminino)
const WALK: Record<'feminino' | 'masculino', Record<'down' | 'right', [string[], string[]]>> = {
  masculino: {
    down: [
      ['......PPPPPPPP......', '......BBBB.PPP......', '...........BBBB.....'],
      ['......PPPPPPPP......', '......PPP.BBBB......', '.....BBBB...........'],
    ],
    right: [
      ['.......PPPPP........', '......PP..PP........', '.....BBB..BBB.......'],
      ['.......PPPPP........', '.......PPPp.........', '.......BBBBB........'],
    ],
  },
  feminino: {
    down: [
      ['......cccccccc......', '.......BBB.PP.......', '...........BBB......'],
      ['......cccccccc......', '.......PP.BBB.......', '......BBB...........'],
    ],
    right: [
      ['......cccccccc......', '.......PP.PP........', '......BBB.BBB.......'],
      ['......cccccccc......', '........PPP.........', '........BBBB........'],
    ],
  },
};

const GLASSES: Record<'down' | 'right', Overlay> = {
  down: o20(8, ['.....GG......GG.....', '....G..G....G..G....', '...GG..GGGGGG..GG...', '....G..G....G..G....', '.....GG......GG.....']),
  right: o20(8, ['.............GG.....', '............G..G....', '.........GGGG..G....', '............G..G....', '.............GG.....']),
};
const BEARD: Record<'down' | 'right', Overlay> = {
  down: o20(12, ['...hh..........hh...', '...hhhh......hhhh...', '....hhhhhhhhhhhh....', '.....hhhhhhhhhh.....']),
  right: o20(12, ['.........hh.....hh..', '.........hhhhhh.hh..', '..........hhhhhhh...', '...........hhhhh....']),
};
const HATS: Record<Dir, Overlay> = {
  down: o20(1, ['.......KKKKKK.......', '.....KKKKKKKKKK.....', '.....KKKKKKKKKK.....', '.....kkkkkkkkkk.....', '.KKKKKKKKKKKKKKKKKK.', '..kkkkkkkkkkkkkkkk..']),
  up: o20(1, ['.......KKKKKK.......', '.....KKKKKKKKKK.....', '.....KKKKKKKKKK.....', '.....kkkkkkkkkk.....', '.KKKKKKKKKKKKKKKKKK.', '..kkkkkkkkkkkkkkkk..']),
  right: o20(1, ['......KKKKKK........', '....KKKKKKKKKK......', '....KKKKKKKKKK......', '....kkkkkkkkkk......', '.KKKKKKKKKKKKKKKKKKK', '..kkkkkkkkkkkkkkkk..']),
};

// Rosto: feminino com cílios, bochechas rosadas (Q) e boca colorida (M); masculino com sobrancelhas
// grossas. Só pinta sobre a pele, então franjas e óculos continuam por cima.
const FACE_FEATURES: Record<Sex | 'neutro', Record<'down' | 'right', Overlay>> = {
  feminino: {
    down: o20(8, ['....E..........E....', '....E..........E....', '....................', '....................', '....QQ........QQ....', '.........MM.........']),
    right: o20(8, ['...............E....', '...............E....', '....................', '....................', '.............QQ.....', '................M...']),
  },
  masculino: {
    down: o20(8, ['....ddd......ddd....', '....................', '....................', '....................', '....................', '.........ss.........']),
    right: o20(8, ['............dddd....', '....................', '....................', '....................', '....................', '................s...']),
  },
  neutro: {
    down: o20(13, ['.........ss.........']),
    right: o20(13, ['................s...']),
  },
};

// Laço grande no cabelo (feminino), como nos personagens clássicos de pixel art.
const HAIR_BOW: Record<Dir, Overlay> = {
  down: o22(1, ['...............RR.RR..', '...............RRrRR..', '................R.R...']),
  up: o22(1, ['..RR.RR...............', '..RRrRR...............', '...R.R................']),
  right: o22(0, ['...RR.RR..............', '...RRrRR..............', '....R.R...............']),
};

function applyOverlay(base: string[], ov: Overlay, onlyOn?: string): string[] {
  const out = base.slice();
  const ox = ov.x ?? 0;
  ov.rows.forEach((row, i) => {
    const y = ov.y + i;
    if (y < 0 || y >= out.length) return;
    const chars = out[y].split('');
    for (let x = 0; x < row.length; x++) {
      const tx = x + ox;
      if (tx < 0 || tx >= chars.length) continue;
      if (row[x] === '.') continue;
      if (onlyOn && !onlyOn.includes(chars[tx])) continue;
      chars[tx] = row[x] === '_' ? '.' : row[x];
    }
    out[y] = chars.join('');
  });
  return out;
}

/** Corpo do quadro: base por sexo e direção, pernas por passo, balanço dos braços e costas sem gola. */
function bodyRows(sex: 'feminino' | 'masculino', dir: Dir, step: 0 | 1 | 2): string[] {
  const view = dir === 'right' ? 'right' : 'down';
  let rows = BODY[sex][view].slice();
  if (step > 0) {
    const legs = WALK[sex][view][step - 1];
    rows = [...rows.slice(0, 8), ...legs];
    if (view === 'down') {
      // braço do lado do passo vai à frente: a mão sobe uma linha
      const cols = rows[6].split('').map((c, x) => (c === 'S' ? x : -1)).filter((x) => x >= 0);
      const side = step === 1 ? cols.filter((x) => x < 10) : cols.filter((x) => x >= 10);
      const r5 = rows[5].split(''), r6 = rows[6].split('');
      for (const x of side) { r5[x] = 'S'; r6[x] = '.'; }
      rows[5] = r5.join(''); rows[6] = r6.join('');
    }
  }
  if (dir === 'up') rows = rows.map((r) => r.replace(/[UT]/g, 'C'));
  return rows;
}

const HAIR_CH = 'HhLd';
/**
 * Sombreamento do cabelo: brilho em arco acompanhando o topo da cabeça (luz vinda de cima à esquerda),
 * mechas verticais nas partes compridas e sombra onde o cabelo encosta no rosto.
 */
function shadeHair(rows: string[], dir: Dir, keepAuthored: boolean): string[] {
  const g = rows.map((r) => r.split(''));
  const W = g[0].length, H = g.length;
  const isHair = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && HAIR_CH.includes(g[y][x]);
  if (!keepAuthored) for (const r of g) for (let x = 0; x < W; x++) if (r[x] === 'L') r[x] = 'H';
  const cols: number[] = [];
  for (let x = 0; x < W; x++) if (g.some((r) => HAIR_CH.includes(r[x]))) cols.push(x);
  if (!cols.length) return rows;
  const x0 = cols[0], x1 = cols[cols.length - 1], span = x1 - x0 + 1;
  // lado iluminado: esquerda na frente e de costas; na vista de lado, o alto da cabeça
  const litFrom = dir === 'right' ? x0 + span * 0.15 : x0 + span * 0.12;
  const litTo = dir === 'right' ? x0 + span * 0.7 : x0 + span * 0.62;
  for (let x = x0; x <= x1; x++) {
    let ty = -1;
    for (let y = 0; y < H; y++) if (isHair(x, y)) { ty = y; break; }
    if (ty < 0 || ty > 8) continue;
    if (x >= litFrom && x <= litTo) {
      const band = x < x0 + span * 0.4 ? [1, 2] : [1];
      for (const dy of band) if (g[ty + dy]?.[x] === 'H') g[ty + dy][x] = 'L';
    }
    // borda direita do volume mais escura
    if (x >= x0 + span * 0.8) for (let y = ty; y < ty + 5 && y < H; y++) if (g[y][x] === 'H' && !isHair(x + 1, y)) g[y][x] = 'h';
  }
  // mechas: linhas escuras nas partes compridas (abaixo da linha dos olhos)
  if (!keepAuthored) for (let y = 11; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== 'H') continue;
    if ((x + (y > 16 ? 1 : 0)) % 3 === 0 && isHair(x - 1, y) && isHair(x + 1, y)) g[y][x] = 'h';
  }
  // sombra do cabelo sobre a testa
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === 'S' && isHair(x, y - 1) && y < 11) g[y][x] = 's';
  }
  return g.map((r) => r.join(''));
}

/** Linhas do quadro 22x28 (exportado para testes). */
export function frameTemplate(look: CharacterLook, dir: Dir, step: 0 | 1 | 2): string[] {
  const sex = look.sex ?? 'masculino';
  const hair = HAIR[look.hairStyle][dir];
  let rows: string[] = Array.from({ length: FRAME_H }, () => '.'.repeat(FRAME_W));
  for (const ov of hair.back ?? []) rows = applyOverlay(rows, ov);
  rows = applyOverlay(rows, { y: 16, x: 1, rows: bodyRows(sex, dir, step) });
  rows = applyOverlay(rows, FACE[dir]);
  if (dir !== 'up') rows = applyOverlay(rows, FACE_FEATURES[look.sex ?? 'neutro'][dir], 'Ss');
  if (look.beard && dir !== 'up') rows = applyOverlay(rows, BEARD[dir]);
  for (const ov of hair.front ?? []) rows = applyOverlay(rows, ov);
  rows = shadeHair(rows, dir, look.hairStyle === 'cacheado');
  if (look.hat) rows = applyOverlay(rows, HATS[dir]);
  else if (look.sex === 'feminino') rows = applyOverlay(rows, HAIR_BOW[dir]);
  if (look.glasses && dir !== 'up') rows = applyOverlay(rows, GLASSES[dir]);
  rows = applyOutfitDetails(rows, look, dir);
  return rows;
}

/** Estampas: função (x, y) -> pinta? Coordenadas do quadro 22x28; o tronco ocupa as linhas 16–24. */
const PATTERN_FN: Record<PatternId, (x: number, y: number, dir: Dir) => boolean> = {
  liso: () => false,
  listras: (_x, y) => y % 2 === 0,
  xadrez: (x, y) => ((x >> 1) + (y >> 1)) % 2 === 0,
  bolinhas: (x, y) => x % 3 === 1 && (y - 16) % 3 === 1,
  coracoes: (x, y) => {
    const tx = ((x + (Math.floor((y - 16) / 4) % 2) * 2) % 5), ty = (y - 16) % 4;
    return (ty === 0 && (tx === 0 || tx === 2)) || (ty === 1 && tx <= 2) || (ty === 2 && tx === 1);
  },
  patinhas: (x, y) => {
    const tx = ((x + (Math.floor((y - 16) / 3) % 2) * 3) % 6), ty = (y - 16) % 3;
    return (ty === 0 && (tx === 0 || tx === 2)) || (ty === 1 && tx <= 2);
  },
  cruz: (x, y, dir) => {
    if (dir === 'up') return false; // emblema só no peito
    const cx = dir === 'right' ? 11 : 13;
    return (x === cx && y >= 17 && y <= 19) || (y === 18 && x >= cx - 1 && x <= cx + 1);
  },
};

function applyOutfitDetails(rows: string[], look: CharacterLook, dir: Dir): string[] {
  const out = rows.map((r) => r.split(''));
  const pat = PATTERN_FN[look.pattern ?? 'liso'];
  const mid = FRAME_W / 2;
  for (let y = 16; y <= 24; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const ch = out[y][x];
      // mangas curtas (camiseta): antebraços à mostra nas laterais
      if (look.shortSleeves && dir !== 'right' && (y === 20 || y === 21) && Math.abs(x + 0.5 - mid) >= 7 && (ch === 'C' || ch === 'c')) { out[y][x] = 'S'; continue; }
      if (look.shortSleeves && dir === 'right' && (y === 20 || y === 21) && (ch === 'C') && out[y][x - 1] === 'O') { out[y][x] = 'S'; continue; }
      // bolso canguru (moletom)
      if (look.pocket && dir === 'down' && y === 21 && x >= 8 && x <= 13 && ch === 'C') { out[y][x] = 'c'; continue; }
      const target = look.patternOn === 'inner' ? ch === 'U' : ch === 'C' || ch === 'c' || ch === 'U' || (ch === 'T' && look.accent === null);
      if (target && pat(x, y, dir)) out[y][x] = ch === 'c' ? 'z' : 'Z';
    }
  }
  return out.map((r) => r.join(''));
}

function colorMap(look: CharacterLook): ColorMap {
  const topShade = look.topShade ?? shade(look.top, -0.2);
  return {
    H: look.hair, h: shade(look.hair, -0.28), L: shade(look.hair, 0.32), d: shade(look.hair, -0.5),
    S: look.skin, s: shade(look.skin, -0.14),
    E: OUTLINE, I: '#4a2e38', W: '#ffffff', O: OUTLINE, G: '#5b5070',
    C: look.top, c: topShade,
    U: look.inner, T: look.accent ?? look.top,
    P: look.pants, p: shade(look.pants, -0.25),
    B: look.shoes,
    K: look.hat ?? '#d8b25a', k: shade(look.hat ?? '#d8b25a', -0.25),
    M: '#c4626f', R: '#e8566a', r: shade('#e8566a', -0.3), Q: '#f29aa6',
    Z: look.patternColor ?? '#f4f0e6', z: shade(look.patternColor ?? '#f4f0e6', -0.2),
  };
}

/** Gera a folha de sprites do personagem (12 quadros de 22x28). */
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
export const PORTRAIT_W = FRAME_W;
export const PORTRAIT_H = 20;

/** Retrato (cabeça e ombros) com expressão, para a caixa de diálogo. */
export function buildPortrait(look: CharacterLook, expression: Expression = 'neutro'): HTMLCanvasElement {
  const canvas = createCanvas(PORTRAIT_W, PORTRAIT_H);
  const ctx = ctx2d(canvas);
  let rows = frameTemplate(look, 'down', 0).slice(0, PORTRAIT_H);
  const face: Record<Expression, Overlay[]> = {
    neutro: [],
    feliz: [o20(9, ['.....EE......EE.....', '....E..E....E..E....', '....................', '....................', '........M..M........', '.........MM.........'])],
    preocupado: [o20(8, ['.....dd......dd.....']), o20(13, ['........MMMM........'])],
    surpreso: [o20(13, ['.........MM.........', '.........MM.........'])],
  };
  if (expression === 'feliz') rows = applyOverlay(rows, o20(9, ['.....SS......SS.....', '.....SS......SS.....', '.....SS......SS.....']), 'EIW');
  for (const ov of face[expression]) rows = applyOverlay(rows, ov, 'SsEIWM');
  const colors = { ...colorMap(look), M: '#8a3b3b' };
  drawTemplate(ctx, rows, colors, 0, 0);
  autoOutline(ctx, 0, 0, PORTRAIT_W, PORTRAIT_H);
  return canvas;
}
