/**
 * Sprites de animais (pixel art original). Cada folha tem quadros de mesma largura em linha.
 */
import { autoOutline, createCanvas, ctx2d, drawTemplate, hashString, rng, shade, type ColorMap } from './pixel';
import { buildPetSheet, PET_H, PET_W } from './pets';

export interface AnimalSheet {
  key: string;
  canvas: HTMLCanvasElement;
  frameW: number;
  frameH: number;
  frames: number;
}

// ---------------- Cão (vista lateral, 20x16) ----------------
const DOG_A = [
  '....................',
  '............ff......',
  '...........fFFFF....',
  '...........fFFFEF...',
  '...........fFFFFFFLN',
  '............FFFFFLLL',
  '..t.........RRFFLL..',
  '..tt.FFFFFFFFFFFF...',
  '...tFFFFFFFFFFFFF...',
  '....FFFFFFFFFFFFF...',
  '....fFFFFFFFFFFFf...',
  '....fFLLLLLLLLLLf...',
  '....ff.f....ff.f....',
  '....ff.f....ff.f....',
  '....LL.L....LL.L....',
  '....................',
];
const DOG_B = DOG_A.map((r, i) => {
  if (i === 6) return '............RRFFLL..';
  if (i === 7) return 'tt...FFFFFFFFFFFF...';
  if (i === 8) return '.tttFFFFFFFFFFFFF...';
  return r;
});
// Coçando: pata traseira levantada até o flanco e cabeça virada para trás
const DOG_SCRATCH = [
  '....................',
  '....................',
  '............ff......',
  '...........fFFFF....',
  '...........fFFFEF...',
  '...........fFFFFFFLN',
  '..t.........FFFFFLLL',
  '..tt.FFFFFFFRRFFLL..',
  '...tFFFFFFFFFFFFF...',
  '....FFFFFFFFFFFFF...',
  '....fFFFFFFFFFFFf...',
  '....fFLLLffLLLLLf...',
  '....ff..fLL.ff.f....',
  '....ff......ff.f....',
  '....LL......LL.L....',
  '....................',
];

export function buildDog(key: string, fur: string, light: string, collar = '#c8373a'): AnimalSheet {
  const fw = 20, fh = 16;
  const c = createCanvas(fw * 4, fh);
  const ctx = ctx2d(c);
  const colors: ColorMap = { F: fur, f: shade(fur, -0.22), L: light, E: '#241b2b', N: '#241b2b', t: fur, R: collar };
  [DOG_A, DOG_B, DOG_SCRATCH, DOG_A].forEach((t, i) => {
    drawTemplate(ctx, t, colors, i * fw, 0);
    autoOutline(ctx, i * fw, 0, fw, fh);
  });
  // quadro 4: piscando (olho fechado)
  ctx.fillStyle = fur;
  ctx.fillRect(3 * fw + 15, 3, 1, 1);
  ctx.fillStyle = shade(fur, -0.4);
  ctx.fillRect(3 * fw + 14, 3, 2, 1);
  return { key, canvas: c, frameW: fw, frameH: fh, frames: 4 };
}

// ---------------- Gato (sentado, de frente, 16x16) ----------------
const CAT_A = [
  '................',
  '...k........k...',
  '...kF......Fk...',
  '...FFFFFFFFFF...',
  '..FFfFFFFFFfFF..',
  '..FFGEFFFFGEFF..',
  '..FFFFFNNFFFFF..',
  '...FFFLLLLFFF...',
  '....FFFFFFFF....',
  '...FFfLLLLfFF...',
  '..FFfFLLLLFfFF..',
  '..FfFFLLLLFFfF..',
  '..FFfFLLLLFfFFtt',
  '..FFFFFFFFFFFFt.',
  '...LL..LL..LL...',
  '................',
];
const CAT_FAT = [
  '................',
  '...k........k...',
  '...kF......Fk...',
  '...FFFFFFFFFF...',
  '..FFfFFFFFFfFF..',
  '..FFGEFFFFGEFF..',
  '..FFFFFNNFFFFF..',
  '...FFFLLLLFFF...',
  '...FFFFFFFFFF...',
  '..FFfFLLLLFfFF..',
  '.FFfFLLLLLLFfFF.',
  '.FfFFLLLLLLFFfF.',
  '.FFfFLLLLLLFfFFt',
  '.FFFFFFFFFFFFFFt',
  '...LL..LL..LL...',
  '................',
];

function catFrames(base: string[]): string[][] {
  const tail2 = base.map((r, i) => {
    if (i === 11) return r.slice(0, 14) + 'tt';
    if (i === 12) return r.slice(0, 15) + 't';
    if (i === 13) return r.slice(0, 14) + '..';
    return r;
  });
  const blink = base.map((r, i) => (i === 5 ? r.replace(/GE/g, 'ff') : r));
  return [base, tail2, base, blink];
}

export function buildCat(key: string, fur: string, light: string, fat = false): AnimalSheet {
  const fw = 16, fh = 16;
  const frames = catFrames(fat ? CAT_FAT : CAT_A);
  const c = createCanvas(fw * frames.length, fh);
  const ctx = ctx2d(c);
  const colors: ColorMap = { F: fur, f: shade(fur, -0.25), L: light, G: '#7cc46a', E: '#241b2b', N: '#e58a9a', k: shade(fur, -0.3), t: fur };
  frames.forEach((t, i) => {
    drawTemplate(ctx, t, colors, i * fw, 0);
    autoOutline(ctx, i * fw, 0, fw, fh);
  });
  return { key, canvas: c, frameW: fw, frameH: fh, frames: frames.length };
}

// ---------------- Vaca (vista lateral, 32x24) ----------------
const COW = [
  '................................',
  '................................',
  '.......................hh...hh..',
  '........................WWWWW...',
  '.....................eeWWWWWWW..',
  '......................WWWEWWWW..',
  '..WWWWWWWWWWWWWWWWWWWWWWWWWWWW..',
  '.WWWWWWWWWWWWWWWWWWWWWWWWWMMMMM.',
  't.WWWWWWWWWWWWWWWWWWWWWWW.MMMNM.',
  't.WWWWWWWWWWWWWWWWWWWWWWW..MMM..',
  't.WWWWWWWWWWWWWWWWWWWWWW........',
  't.WWWWWWWWWWWWWWWWWWWWWW........',
  'k.WWWWWWWWWWWWWWWWWWWWWW........',
  '..WWWWWWWWWWWWWWWWWWWWWW........',
  '...WWWWWWUUUUWWWWWWWWWW.........',
  '...WWWw..UUU.....WWWwWW.........',
  '...WWWw..........WWWwWW.........',
  '...WWWw..........WWWwWW.........',
  '...WWWw..........WWWwWW.........',
  '...KKKK..........KKKKKK.........',
  '................................',
  '................................',
  '................................',
  '................................',
];
const COW_GRAZE = COW.map((r, i) => {
  // cabeça abaixada pastando
  const head: Record<number, string> = {
    2: '................................',
    3: '................................',
    4: '................................',
    5: '................................',
    6: '..WWWWWWWWWWWWWWWWWWWWWWWW......',
    7: '.WWWWWWWWWWWWWWWWWWWWWWWWWhh....',
    8: 't.WWWWWWWWWWWWWWWWWWWWWWWWWWW...',
    9: 't.WWWWWWWWWWWWWWWWWWWWWWWeWWWW..',
    10: 't.WWWWWWWWWWWWWWWWWWWWWW.WWEWWW.',
    11: 't.WWWWWWWWWWWWWWWWWWWWWW..WMMMM.',
    12: 'k.WWWWWWWWWWWWWWWWWWWWWW..MMMNM.',
    13: '..WWWWWWWWWWWWWWWWWWWWWW...MMM..',
  };
  return head[i] ?? r;
});

export function buildCow(key: string): AnimalSheet {
  const fw = 32, fh = 24;
  const c = createCanvas(fw * 2, fh);
  const ctx = ctx2d(c);
  const colors: ColorMap = { W: '#f4f1ea', w: '#cfcbc4', M: '#e9a3a8', N: '#6b3b44', E: '#241b2b', e: '#2e2a33', h: '#e8dcc0', K: '#3a3236', U: '#eaa0a6', t: '#f4f1ea', k: '#2e2a33' };
  [COW, COW_GRAZE].forEach((t, i) => {
    drawTemplate(ctx, t, colors, i * fw, 0);
    // manchas holandesas determinísticas
    const r = rng(hashString(key) + 7);
    const spots = [[6, 8, 4], [13, 10, 3], [19, 7, 3], [9, 12, 2], [16, 13, 2]];
    for (const [sx, sy, rad] of spots) {
      for (let y = -rad; y <= rad; y++) for (let x = -rad - 1; x <= rad + 1; x++) {
        if ((x * x) / ((rad + 1) * (rad + 1)) + (y * y) / (rad * rad) > 1 + (r() - 0.5) * 0.4) continue;
        const X = i * fw + sx + x, Y = sy + y;
        const d = ctx.getImageData(X, Y, 1, 1).data;
        if (d[3] > 0 && d[0] > 200 && d[1] > 200) { ctx.fillStyle = '#2e2a33'; ctx.fillRect(X, Y, 1, 1); }
      }
    }
    autoOutline(ctx, i * fw, 0, fw, fh);
  });
  return { key, canvas: c, frameW: fw, frameH: fh, frames: 2 };
}

// ---------------- Ovelha (vista lateral, 20x16) ----------------
const SHEEP = [
  '....................',
  '....................',
  '....ww.ww.ww........',
  '...wWWwWWwWWw..DDD..',
  '..wWWWWWWWWWWwDDDDD.',
  '.wWWWWWWWWWWWWDDEDDD',
  '.WWWWWWWWWWWWWWDDDD.',
  '.wWWWWWWWWWWWWWwDD..',
  '.WWWWWWWWWWWWWWw....',
  '.wWWWWWWWWWWWWWw....',
  '..wWWwWWwWWwWWw.....',
  '...DD.D.....DD.D....',
  '...DD.D.....DD.D....',
  '...DD.D.....DD.D....',
  '...KK.K.....KK.K....',
  '....................',
];
export function buildSheep(key: string): AnimalSheet {
  const fw = 20, fh = 16;
  const c = createCanvas(fw * 2, fh);
  const ctx = ctx2d(c);
  const colors: ColorMap = { W: '#f2efe4', w: '#d2ccbd', D: '#4a3e45', E: '#f2efe4', K: '#2a2228' };
  const graze = SHEEP.map((r, i) => {
    const m: Record<number, string> = {
      3: '...wWWwWWwWWw.......',
      4: '..wWWWWWWWWWWw......',
      5: '.wWWWWWWWWWWWWw.....',
      6: '.WWWWWWWWWWWWWWDDD..',
      7: '.wWWWWWWWWWWWWWDDDD.',
      8: '.WWWWWWWWWWWWWWDEDDD',
      9: '.wWWWWWWWWWWWWWwDDD.',
    };
    return m[i] ?? r;
  });
  [SHEEP, graze].forEach((t, i) => {
    drawTemplate(ctx, t, colors, i * fw, 0);
    autoOutline(ctx, i * fw, 0, fw, fh);
  });
  return { key, canvas: c, frameW: fw, frameH: fh, frames: 2 };
}

// ---------------- Pulga (ícone didático 16x16 para o VetiDex) ----------------
const FLEA = [
  '................',
  '................',
  '.......bbb......',
  '.....bbBBBbb....',
  '....bBBBBBBBb...',
  '...bBBhBBBBBBb..',
  '..EbBBBBBBBBBb..',
  '..bbBBBBBBBBb...',
  '...bbBBBBBbb....',
  '....l.l..l.l....',
  '...l..l..l..l...',
  '..l...l...l..l..',
  '..l...l....l..l.',
  '................',
  '................',
  '................',
];
export function buildFlea(key: string): AnimalSheet {
  const c = createCanvas(16, 16);
  const ctx = ctx2d(c);
  drawTemplate(ctx, FLEA, { b: '#5a3220', B: '#8a4f2c', h: '#c28456', E: '#241b2b', l: '#5a3220' });
  autoOutline(ctx, 0, 0, 16, 16);
  return { key, canvas: c, frameW: 16, frameH: 16, frames: 1 };
}

export function buildAllAnimals(): AnimalSheet[] {
  return [
    buildDog('dog_caramelo', '#d08a45', '#f1d3a1'),
    buildDog('dog_campus', '#5b4a44', '#e8dccb', '#3d6fb6'),
    buildCat('cat_laranja', '#e59a45', '#f8e2bf', true),
    buildCat('cat_cinza', '#8a8d99', '#e2e2e8'),
    buildCow('cow'),
    buildSheep('sheep'),
    buildFlea('flea'),
    { key: 'dog_bidu', canvas: buildPetSheet({ kind: 'dog', size: 'm', bodyLen: 10, legLen: 3, ear: 'flop', snout: 2, tail: 'down', coat: 'short', pattern: 'saddle', base: '#b07040', dark: '#2e2a33' }), frameW: PET_W, frameH: PET_H, frames: 4 },
    { key: 'cat_luna', canvas: buildPetSheet({ kind: 'cat', size: 'm', bodyLen: 10, legLen: 3, ear: 'up', snout: 1, tail: 'up', coat: 'short', pattern: 'point', base: '#efe3cc', dark: '#4a3a33', eye: '#5aa8e8' }), frameW: PET_W, frameH: PET_H, frames: 4 },
    { key: 'pup_pingo', canvas: buildPetSheet({ kind: 'dog', size: 'xs', bodyLen: 7, legLen: 2, ear: 'flop', snout: 1, tail: 'up', coat: 'short', pattern: 'tuxedo', base: '#6b4a3a', light: '#f2efe8' }), frameW: PET_W, frameH: PET_H, frames: 4 },
  ];
}
