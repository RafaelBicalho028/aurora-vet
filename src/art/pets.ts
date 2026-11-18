/**
 * Gerador procedural de sprites de pets (vista lateral, 24x18 por quadro).
 * Quadros: 0 parado, 1 passo A, 2 passo B, 3 ocioso (cauda/piscar).
 * Cães e gatos são montados a partir de parâmetros (porte, orelhas, focinho, cauda, pelagem, padrão de cor).
 */
import { autoOutline, createCanvas, ctx2d, drawTemplate, shade, type ColorMap } from './pixel';
import type { PetLook } from '../content/pets';

export const PET_W = 24;
export const PET_H = 18;
export const PET_FRAMES = 4;

class Grid {
  g: string[][] = Array.from({ length: PET_H }, () => Array.from({ length: PET_W }, () => '.'));
  set(x: number, y: number, c: string): void { if (x >= 0 && y >= 0 && x < PET_W && y < PET_H) this.g[y][x] = c; }
  get(x: number, y: number): string { return this.g[y]?.[x] ?? '.'; }
  rect(x: number, y: number, w: number, h: number, c: string): void { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  /** troca a cor apenas de pixels já preenchidos */
  paint(x: number, y: number, c: string): void { if (this.get(x, y) !== '.') this.set(x, y, c); }
  paintRect(x: number, y: number, w: number, h: number, c: string): void { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.paint(i, j, c); }
  rows(): string[] { return this.g.map((r) => r.join('')); }
}

const BODY_H = { xs: 3, s: 3, m: 4, l: 5 } as const;
const HEAD_S = { xs: 4, s: 4, m: 5, l: 5 } as const;

function quadruped(look: PetLook, frame: number): Grid {
  const G = new Grid();
  const isCat = look.kind === 'cat';
  const L = look.legLen;
  const bodyBottom = 15 - L;
  const bodyH = BODY_H[look.size];
  const bodyTop = bodyBottom - bodyH + 1;
  const hs = HEAD_S[look.size];
  const totalW = 3 + look.bodyLen + (hs - 2) + look.snout;
  const x0 = Math.max(3, Math.floor((PET_W - totalW) / 2) + 3);
  const x1 = x0 + look.bodyLen - 1;

  // corpo
  G.rect(x0, bodyTop, look.bodyLen, bodyH, 'F');
  G.set(x0, bodyTop, '.');
  G.set(x0, bodyBottom, '.');
  G.set(x1, bodyBottom, '.');
  // cabeça
  const hx0 = x1 - 1, hx1 = hx0 + hs - 1, hBot = bodyTop + 1, hTop = hBot - hs + 1;
  G.rect(hx0, hTop, hs, hs, 'F');
  G.set(hx0, hTop, '.');
  G.set(hx1, hTop, '.');
  if (isCat) G.set(hx1, hBot, '.');
  // focinho e nariz
  for (let i = 1; i <= look.snout; i++) { G.set(hx1 + i, hBot - 1, 'M'); G.set(hx1 + i, hBot, i === look.snout ? '.' : 'M'); }
  if (look.snout > 0) G.set(hx1 + look.snout, hBot, 'M');
  const noseX = hx1 + look.snout;
  G.set(noseX, hBot - 1, isCat ? 'K' : 'N');
  // olho
  const eyeY = hTop + Math.floor(hs / 2) - 1;
  const eyeX = hx1 - 1 - (look.snout === 0 ? 1 : 0);
  // orelhas
  const ear = look.ear;
  if (ear === 'up' || ear === 'tuft') {
    G.set(hx0 + 1, hTop - 1, 'R'); G.set(hx0 + 1, hTop - 2, 'R'); G.set(hx0 + 2, hTop - 1, 'R');
    if (isCat) { G.set(hx1 - 1, hTop - 1, 'R'); G.set(hx1 - 1, hTop - 2, 'R'); G.set(hx1 - 2, hTop - 1, 'R'); }
    if (ear === 'tuft') { G.set(hx0 + 1, hTop - 3, 'D'); if (isCat) G.set(hx1 - 1, hTop - 3, 'D'); }
  } else if (ear === 'bat') {
    G.rect(hx0, hTop - 2, 2, 2, 'R'); G.set(hx0 + 1, hTop - 3, 'R');
    if (isCat) { G.rect(hx1 - 2, hTop - 2, 2, 2, 'R'); G.set(hx1 - 2, hTop - 3, 'R'); }
  } else if (ear === 'small') {
    G.set(hx0 + 1, hTop - 1, 'R'); G.set(hx0 + 2, hTop - 1, 'R');
    if (isCat) G.set(hx1 - 1, hTop - 1, 'R');
  } else if (ear === 'flop' || ear === 'long') {
    G.set(hx0, hTop, 'R'); G.set(hx0 + 1, hTop, 'R'); G.set(hx0, hTop + 1, 'R'); G.set(hx0 + 1, hTop + 1, 'R'); G.set(hx0, hTop + 2, 'R');
    if (ear === 'long') { G.set(hx0 + 1, hTop + 2, 'R'); G.set(hx0, hTop + 3, 'R'); G.set(hx0 + 1, hTop + 3, 'R'); }
  }
  // patas (com animação de passo)
  const legRows = (x: number, dx: number, far: boolean) => {
    for (let r = 0; r < L; r++) {
      const y = bodyBottom + 1 + r;
      const lower = r >= L - 2;
      const xx = x + (lower ? dx : 0);
      G.set(xx, y, far ? 'f' : r === L - 1 ? 'P' : 'F');
      if (!far && !isCat && look.size !== 'xs') G.set(xx + 1, y, r === L - 1 ? 'P' : 'F');
    }
  };
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  // pares diagonais se movem juntos
  legRows(x0 + 2, -step, true);
  legRows(x1 - 2, step, true);
  legRows(x0, step, false);
  legRows(x1 - 1 - (isCat || look.size === 'xs' ? 0 : 1), -step, false);
  // cauda
  const wag = frame === 3 ? 1 : 0;
  const tail = (pts: [number, number][], c = 'Q') => pts.forEach(([x, y]) => G.set(x, y, c));
  switch (look.tail) {
    case 'up':
      if (isCat) tail([[x0 - 1, bodyTop], [x0 - 2, bodyTop - 1], [x0 - 2, bodyTop - 2], [x0 - 2 - wag, bodyTop - 3], [x0 - 1 - wag, bodyTop - 4]]);
      else tail(wag ? [[x0 - 1, bodyTop], [x0 - 2, bodyTop], [x0 - 3, bodyTop - 1]] : [[x0 - 1, bodyTop], [x0 - 2, bodyTop - 1], [x0 - 2, bodyTop - 2]]);
      break;
    case 'down': tail([[x0 - 1, bodyTop + 1], [x0 - 2, bodyTop + 2], [x0 - 2 - wag, bodyTop + 3]]); break;
    case 'plume':
      if (isCat) tail([[x0 - 1, bodyTop], [x0 - 1, bodyTop + 1], [x0 - 2, bodyTop], [x0 - 2, bodyTop - 1], [x0 - 3, bodyTop - 1], [x0 - 3, bodyTop - 2], [x0 - 3 - wag, bodyTop - 3], [x0 - 2 - wag, bodyTop - 4]]);
      else tail([[x0 - 1, bodyTop], [x0 - 1, bodyTop + 1], [x0 - 2, bodyTop + 1], [x0 - 2, bodyTop + 2], [x0 - 3 - wag, bodyTop + 2], [x0 - 3 - wag, bodyTop + 3]]);
      break;
    case 'curl': tail([[x0, bodyTop - 1], [x0 + 1, bodyTop - 1], [x0 - 1, bodyTop - 1 + wag], [x0 - 1, bodyTop - 2 + wag], [x0, bodyTop - 2]]); break;
    case 'stub': tail([[x0 - 1, bodyTop + wag]]); break;
    case 'pom': tail([[x0 - 1, bodyTop], [x0 - 2, bodyTop - 1], [x0 - 3, bodyTop - 2 - wag], [x0 - 2, bodyTop - 2 - wag], [x0 - 3, bodyTop - 3 - wag], [x0 - 2, bodyTop - 3 - wag]]); break;
  }
  // pelagem
  if (look.coat === 'long' || look.coat === 'fluffy') {
    for (let x = x0 + 1; x <= x1 - 1; x++) if (look.legLen <= 2 || x % 2 === 0) G.set(x, bodyBottom + 1, look.legLen <= 2 ? 'F' : G.get(x, bodyBottom + 1) === '.' ? 'F' : G.get(x, bodyBottom + 1));
  }
  if (look.coat === 'fluffy' || look.coat === 'curly') {
    for (let x = x0 + 1; x <= x1 - 2; x += 2) G.set(x, bodyTop - 1, 'F');
    G.set(hx0 - 1, bodyTop + 1, 'F');
  }
  if (look.coat === 'curly') for (let x = hx0 + 1; x <= hx1 - 1; x += 2) G.set(x, hTop - 1, 'F');
  if (look.coat === 'hairless') { for (let x = x0 + 2; x <= x1 - 2; x += 3) G.paint(x, bodyTop + 1, 'f'); G.paint(hx0 + 1, hTop + 1, 'f'); }

  // padrões de cor
  const muzzleToward = (c: string) => { for (let y = hBot - 1; y <= hBot; y++) for (let x = hx1 - 1; x <= hx1 + look.snout; x++) if (G.get(x, y) === 'F' || G.get(x, y) === 'M') G.set(x, y, c); };
  const legsTo = (c: string) => { for (let y = bodyBottom + 1; y <= 15; y++) for (let x = 0; x < PET_W; x++) if ('FP'.includes(G.get(x, y))) G.set(x, y, c); };
  const earsTo = (c: string) => { for (let y = 0; y < PET_H; y++) for (let x = 0; x < PET_W; x++) if (G.get(x, y) === 'R') G.set(x, y, c); };
  const tailTo = (c: string) => { for (let y = 0; y < PET_H; y++) for (let x = 0; x < PET_W; x++) if (G.get(x, y) === 'Q') G.set(x, y, c); };
  switch (look.pattern) {
    case 'belly':
      G.paintRect(x0 + 1, bodyBottom, look.bodyLen - 2, 1, 'L');
      muzzleToward('L');
      break;
    case 'saddle':
      G.paintRect(x0, bodyTop, look.bodyLen - 1, 2, 'D');
      muzzleToward('D'); earsTo('D'); tailTo('D');
      break;
    case 'tan':
      G.paintRect(hx0, hTop, hs, hs, 'T'); legsTo('T'); earsTo('T'); muzzleToward('T');
      break;
    case 'tuxedo':
      G.paintRect(x1 - 1, bodyTop + 1, 2, bodyH - 1, 'W'); G.paintRect(x0 + 1, bodyBottom, look.bodyLen - 2, 1, 'W');
      muzzleToward('W'); for (let y = bodyBottom + 1; y <= 15; y++) for (let x = 0; x < PET_W; x++) if (G.get(x, y) === 'P') G.set(x, y, 'W');
      if (!isCat) G.paintRect(hx0 + 2, hTop, 1, hs - 1, 'W');
      break;
    case 'mask':
      G.paintRect(x0, bodyBottom - 1, look.bodyLen, 2, 'W'); legsTo('W'); muzzleToward('W'); G.paintRect(hx0, hBot, hs, 1, 'W');
      G.paint(eyeX, eyeY - 1, 'W'); G.paint(eyeX - 1, eyeY + 1, 'W');
      break;
    case 'darkmask':
      muzzleToward('D'); earsTo('D'); G.paintRect(hx1 - 1, eyeY + 1, 2, hBot - eyeY, 'D');
      if (look.light) G.paintRect(x0 + 1, bodyBottom, look.bodyLen - 2, 1, 'L');
      break;
    case 'patches':
      G.paintRect(x0 + 1, bodyTop, 3, 2, 'D'); G.paintRect(hx0, hTop, 2, 2, 'D'); earsTo('D');
      break;
    case 'tricolor':
      G.paintRect(x0 + 1, bodyTop, 3, 2, 'O'); G.paintRect(x1 - 3, bodyTop, 2, 2, 'D'); G.paintRect(hx0 + 1, hTop, 2, 2, 'O'); earsTo('D'); tailTo('O');
      break;
    case 'tabby':
      for (let x = x0 + 1; x <= x1 - 1; x += 2) G.paintRect(x, bodyTop, 1, Math.max(2, bodyH - 2), 'D');
      G.paint(hx0 + 2, hTop, 'D'); G.paint(hx0 + 3, hTop + 1, 'D');
      if (look.light) { G.paintRect(x0 + 1, bodyBottom, look.bodyLen - 2, 1, 'L'); muzzleToward('L'); }
      for (let y = 0; y < PET_H; y++) for (let x = 0; x < PET_W; x++) if (G.get(x, y) === 'Q' && (x + y) % 2 === 0) G.set(x, y, 'D');
      break;
    case 'point':
      muzzleToward('D'); earsTo('D'); tailTo('D'); legsTo('D'); G.paint(eyeX + 1, eyeY + 1, 'D');
      break;
    case 'solid':
      if (look.light) muzzleToward('L');
      break;
  }
  G.set(eyeX, eyeY, frame === 3 && isCat ? 'f' : 'E');
  if (look.kind === 'cat' && look.coat !== 'hairless') G.set(noseX + 1, hBot - 1, '.');
  return G;
}

function rabbit(look: PetLook, frame: number): Grid {
  const G = new Grid();
  const up = frame === 1 ? 1 : 0;
  const y0 = 10 - up;
  G.rect(6, y0, 9, 5, 'F'); G.set(6, y0, '.'); G.set(14, y0, '.'); G.set(6, y0 + 4, '.');
  G.rect(13, y0 - 2, 4, 4, 'F'); G.set(16, y0 - 2, '.');
  G.rect(13, y0 - 7, 1, 5, 'R'); G.rect(14, y0 - 6, 1, 4, 'R'); G.set(14, y0 - 5, 'K'); G.set(14, y0 - 4, 'K');
  G.set(15, y0 - 1, 'E'); G.set(17, y0, frame === 3 ? 'F' : 'K'); G.set(17, y0, 'K');
  G.set(5, y0 + 1, 'W'); G.set(5, y0 + 2, 'W'); G.set(4, y0 + 1, 'W');
  G.rect(7, y0 + 5, 3, 1 + up, 'F'); G.rect(6, 15, 4, 1, 'P');
  G.rect(13, y0 + 5, 1, 1 + up, 'F'); G.set(13, 15, 'P'); G.set(14, 15, 'P');
  if (look.pattern === 'patches') { G.paintRect(6, y0, 4, 5, 'D'); G.paintRect(13, y0 - 2, 2, 3, 'D'); for (let y = 0; y < PET_H; y++) for (let x = 0; x < PET_W; x++) if (G.get(x, y) === 'R') G.set(x, y, 'D'); }
  return G;
}

function guineapig(look: PetLook, frame: number): Grid {
  const G = new Grid();
  const bob = frame === 1 ? 1 : 0;
  G.rect(5, 10 + bob, 12, 5 - bob, 'F'); G.set(5, 10 + bob, '.'); G.set(16, 10 + bob, '.'); G.set(5, 14, '.'); G.set(16, 14, '.');
  G.rect(15, 11 + bob, 3, 3, 'F');
  G.set(14, 9 + bob, 'R'); G.set(15, 9 + bob, 'R');
  G.set(16, 11 + bob, 'E'); G.set(18, 12 + bob, 'K');
  G.set(7 + (frame === 2 ? 1 : 0), 15, 'P'); G.set(14 - (frame === 2 ? 1 : 0), 15, 'P');
  if (look.pattern === 'tricolor') { G.paintRect(5, 10, 4, 5, 'O'); G.paintRect(12, 10, 3, 5, 'D'); G.paintRect(15, 11, 2, 2, 'D'); }
  G.set(16, 11 + bob, 'E'); // olho por último, para não ser coberto pelo padrão
  return G;
}

function hamster(look: PetLook, frame: number): Grid {
  const G = new Grid();
  const bob = frame === 1 ? 1 : 0;
  G.rect(8, 10 + bob, 8, 5 - bob, 'F'); G.set(8, 10 + bob, '.'); G.set(15, 10 + bob, '.'); G.set(8, 14, '.');
  G.rect(14, 10 + bob, 3, 4, 'F'); G.set(16, 10 + bob, '.');
  G.set(14, 9 + bob, 'K'); G.set(13, 9 + bob, 'R');
  G.set(15, 11 + bob, 'E'); G.set(17, 12 + bob, 'K');
  G.paintRect(9, 14, 6, 1, 'L'); G.paint(16, 13, 'L'); G.paint(17, 12, 'K');
  G.set(10 + (frame === 2 ? 1 : 0), 15, 'P'); G.set(14, 15, 'P');
  if (frame === 3) G.set(15, 11, 'f');
  void look;
  return G;
}

function cockatiel(look: PetLook, frame: number): Grid {
  const G = new Grid();
  const crest = frame === 3 ? 1 : 0;
  G.rect(9, 7, 5, 7, 'F'); G.set(9, 7, '.'); G.set(9, 13, '.'); G.set(13, 13, '.');
  G.rect(11, 3, 4, 4, 'L'); G.set(11, 3, '.'); G.set(14, 3, '.');
  G.set(13, 2, 'L'); G.set(12, 1 - crest, 'L'); G.set(13, 1, 'L'); G.set(12, 2, 'L'); G.set(11, 0 + (1 - crest), 'L');
  G.set(14, 6, 'T'); G.set(13, 5, 'E'); G.set(15, 5, 'N'); G.set(15, 6, 'N');
  G.paintRect(9, 8, 3, 5, 'f'); G.paint(10, 9, 'W'); G.paint(10, 10, 'W'); G.paint(10, 11, 'W');
  G.set(8, 13, 'f'); G.set(7, 14, 'f'); G.set(6, 15, 'f'); G.set(8, 14, 'f');
  const s = frame === 1 ? 1 : 0;
  G.set(11, 14, 'K'); G.set(12, 14, 'K'); G.set(11 - s, 15, 'K'); G.set(13 + (frame === 2 ? 1 : 0), 15, 'K');
  void look;
  return G;
}

function colorMap(look: PetLook): ColorMap {
  const base = look.base;
  return {
    F: base, f: shade(base, -0.22), R: look.kind === 'dog' || look.kind === 'cat' ? shade(base, -0.12) : base, Q: base,
    L: look.light ?? shade(base, 0.35), M: look.pattern === 'belly' || look.pattern === 'mask' || look.pattern === 'tuxedo' ? (look.light ?? shade(base, 0.35)) : base,
    D: look.dark ?? shade(base, -0.45), T: look.accent ?? '#c8955a', O: look.accent ?? '#e08a3a',
    W: look.light ?? '#f2efe8', P: shade(base, -0.1), N: look.kind === 'cockatiel' ? '#cbbfb4' : '#241b2b',
    E: look.eye ?? '#241b2b', K: '#e58a9a',
  };
}

export function petFrameRows(look: PetLook, frame: number): string[] {
  switch (look.kind) {
    case 'rabbit': return rabbit(look, frame).rows();
    case 'guineapig': return guineapig(look, frame).rows();
    case 'hamster': return hamster(look, frame).rows();
    case 'cockatiel': return cockatiel(look, frame).rows();
    default: return quadruped(look, frame).rows();
  }
}

/** Folha de sprites do pet: 4 quadros de 24x18, voltado para a direita. */
export function buildPetSheet(look: PetLook): HTMLCanvasElement {
  const c = createCanvas(PET_W * PET_FRAMES, PET_H);
  const ctx = ctx2d(c);
  const colors = colorMap(look);
  for (let f = 0; f < PET_FRAMES; f++) {
    drawTemplate(ctx, petFrameRows(look, f), colors, f * PET_W, 0);
    autoOutline(ctx, f * PET_W, 0, PET_W, PET_H);
  }
  return c;
}

/** Coração usado ao fazer carinho no pet. */
export function buildHeart(): HTMLCanvasElement {
  const c = createCanvas(9, 8);
  const ctx = ctx2d(c);
  drawTemplate(ctx, ['.HH...HH.', 'HhHH.HHHH', 'HHHHHHHHH', 'HHHHHHHHH', '.HHHHHHH.', '..HHHHH..', '...HHH...', '....H....'], { H: '#ef5a78', h: '#ffd1dc' });
  return c;
}
