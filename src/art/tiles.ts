/**
 * Desenho procedural de tiles de chão (16x16). Os tiles consideram os vizinhos para bordas suaves.
 */
import { px, rng, shade } from './pixel';

export const TILE = 16;

export type GroundKind =
  | 'grass' | 'flowers' | 'path' | 'dirt' | 'plaza' | 'water' | 'sand'
  | 'floor_clinic' | 'floor_wood' | 'floor_lab' | 'rug' | 'wall' | 'void' | 'mat' | 'counter';

export interface TileContext {
  kind: GroundKind;
  same: (dx: number, dy: number) => boolean; // vizinho é do mesmo tipo?
  kindAt: (dx: number, dy: number) => GroundKind | null;
  seed: number;
  wallColor?: string;
}

const G = { base: '#5fa652', dark: '#4e9146', light: '#78bd62', deep: '#447f3d' };

function grass(ctx: CanvasRenderingContext2D, x: number, y: number, r: () => number) {
  px(ctx, x, y, G.base, 16, 16);
  for (let i = 0; i < 10; i++) px(ctx, x + Math.floor(r() * 16), y + Math.floor(r() * 16), G.dark);
  const tufts = 1 + Math.floor(r() * 3);
  for (let i = 0; i < tufts; i++) {
    const tx = x + 2 + Math.floor(r() * 11), ty = y + 3 + Math.floor(r() * 10);
    px(ctx, tx, ty, G.deep); px(ctx, tx + 2, ty, G.deep); px(ctx, tx + 1, ty + 1, G.deep);
    px(ctx, tx, ty - 1, G.light); px(ctx, tx + 2, ty - 1, G.light);
  }
}

function flowers(ctx: CanvasRenderingContext2D, x: number, y: number, r: () => number) {
  grass(ctx, x, y, r);
  const palette = [['#f4f0e6', '#e8c13c'], ['#f1d24a', '#d47a2a'], ['#e889b5', '#f6e4ee'], ['#9fb7f2', '#f4f0e6']];
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const [petal, center] = palette[Math.floor(r() * palette.length)];
    const fx = x + 2 + Math.floor(r() * 11), fy = y + 2 + Math.floor(r() * 11);
    px(ctx, fx, fy + 2, G.deep);
    px(ctx, fx - 1, fy, petal); px(ctx, fx + 1, fy, petal); px(ctx, fx, fy - 1, petal); px(ctx, fx, fy + 1, petal);
    px(ctx, fx, fy, center);
  }
}

function edgeGrass(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext, isGround: (k: GroundKind | null) => boolean, edgeColor: string) {
  // Bordas: onde o vizinho é grama, desenha franja de grama e uma linha de sombra.
  const r = rng(t.seed + 99);
  const sides: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dx, dy] of sides) {
    if (isGround(t.kindAt(dx, dy))) continue;
    const k = t.kindAt(dx, dy);
    if (k !== 'grass' && k !== 'flowers') continue;
    for (let i = 0; i < 16; i++) {
      const fringe = r() < 0.5 ? 1 : 2;
      if (dy === -1) { px(ctx, x + i, y, G.base, 1, fringe); px(ctx, x + i, y + fringe, edgeColor); }
      if (dy === 1) { px(ctx, x + i, y + 16 - fringe, G.base, 1, fringe); }
      if (dx === -1) { px(ctx, x, y + i, G.base, fringe, 1); px(ctx, x + fringe, y + i, edgeColor); }
      if (dx === 1) { px(ctx, x + 16 - fringe, y + i, G.base, fringe, 1); px(ctx, x + 15 - fringe, y + i, edgeColor); }
    }
  }
}

function path(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext, r: () => number) {
  const base = '#dacca6', grout = '#bba985', hi = '#e9dfc3';
  px(ctx, x, y, base, 16, 16);
  // pedras em padrão de tijolos
  for (let row = 0; row < 4; row++) {
    const yy = y + row * 4;
    px(ctx, x, yy + 3, grout, 16, 1);
    const off = row % 2 === 0 ? 0 : 4;
    for (let col = -1; col < 3; col++) {
      const xx = x + off + col * 8;
      if (xx >= x && xx < x + 16) px(ctx, xx, yy, grout, 1, 3);
      if (xx + 1 >= x && xx + 1 < x + 16) px(ctx, xx + 1, yy, hi, Math.min(5, x + 16 - xx - 1), 1);
    }
  }
  if (r() < 0.3) px(ctx, x + Math.floor(r() * 14) + 1, y + Math.floor(r() * 14) + 1, shade(base, -0.12));
  edgeGrass(ctx, x, y, t, (k) => k === 'path' || k === 'plaza', '#8f9c5c');
}

function dirt(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext, r: () => number) {
  px(ctx, x, y, '#c39a62', 16, 16);
  for (let i = 0; i < 8; i++) px(ctx, x + Math.floor(r() * 16), y + Math.floor(r() * 16), '#a98250');
  for (let i = 0; i < 3; i++) { const sx = x + Math.floor(r() * 14), sy = y + Math.floor(r() * 14); px(ctx, sx, sy, '#d9b884', 2, 1); px(ctx, sx, sy + 1, '#8e6a3e', 2, 1); }
  edgeGrass(ctx, x, y, t, (k) => k === 'dirt', '#7f8a4e');
}

function plaza(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, '#cfc8bd', 16, 16);
  px(ctx, x, y, '#b6ad9f', 16, 1); px(ctx, x, y + 8, '#b6ad9f', 16, 1);
  px(ctx, x, y, '#b6ad9f', 1, 16); px(ctx, x + 8, y, '#b6ad9f', 1, 16);
  px(ctx, x + 1, y + 1, '#ddd7cd', 7, 1); px(ctx, x + 9, y + 9, '#ddd7cd', 7, 1);
}

function water(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext, r: () => number) {
  px(ctx, x, y, '#3f86c6', 16, 16);
  for (let i = 0; i < 3; i++) {
    const wx = x + Math.floor(r() * 11), wy = y + 2 + Math.floor(r() * 12);
    px(ctx, wx, wy, '#79b6e6', 4, 1); px(ctx, wx + 1, wy - 1, '#a8d4f2', 2, 1);
  }
  const notWater = (dx: number, dy: number) => !t.same(dx, dy);
  if (notWater(0, -1)) { px(ctx, x, y, '#cdbb86', 16, 3); px(ctx, x, y + 3, '#2f6aa3', 16, 2); }
  if (notWater(0, 1)) { px(ctx, x, y + 14, '#cdbb86', 16, 2); }
  if (notWater(-1, 0)) { px(ctx, x, y, '#cdbb86', 2, 16); px(ctx, x + 2, y, '#2f6aa3', 1, 16); }
  if (notWater(1, 0)) { px(ctx, x + 14, y, '#cdbb86', 2, 16); }
}

function sand(ctx: CanvasRenderingContext2D, x: number, y: number, r: () => number) {
  px(ctx, x, y, '#e2cf96', 16, 16);
  for (let i = 0; i < 8; i++) px(ctx, x + Math.floor(r() * 16), y + Math.floor(r() * 16), '#c9b278');
}

function floorClinic(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, '#e6edf0', 16, 16);
  px(ctx, x, y, '#cbd6dc', 16, 1); px(ctx, x, y, '#cbd6dc', 1, 16);
  px(ctx, x + 8, y, '#d6dfe4', 1, 16); px(ctx, x, y + 8, '#d6dfe4', 16, 1);
  px(ctx, x + 2, y + 2, '#f5f8f9', 3, 1);
}

function floorWood(ctx: CanvasRenderingContext2D, x: number, y: number, r: () => number) {
  for (let row = 0; row < 4; row++) {
    const c = row % 2 ? '#b98654' : '#c08f5c';
    px(ctx, x, y + row * 4, c, 16, 4);
    px(ctx, x, y + row * 4 + 3, '#946739', 16, 1);
    const cut = Math.floor(r() * 14) + 1;
    px(ctx, x + cut, y + row * 4, '#946739', 1, 3);
    if (r() < 0.4) px(ctx, x + Math.floor(r() * 14), y + row * 4 + 1, '#cf9f6c', 3, 1);
  }
}

function floorLab(ctx: CanvasRenderingContext2D, x: number, y: number, r: () => number) {
  px(ctx, x, y, '#c4d9cf', 16, 16);
  for (let i = 0; i < 6; i++) px(ctx, x + Math.floor(r() * 16), y + Math.floor(r() * 16), '#b2cabf');
  px(ctx, x, y + 15, '#adc4b9', 16, 1); px(ctx, x + 15, y, '#adc4b9', 1, 16);
}

function rug(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext) {
  px(ctx, x, y, '#b0484f', 16, 16);
  for (let i = 0; i < 16; i += 4) px(ctx, x + i, y + i % 8, '#c75f63', 2, 2);
  if (!t.same(0, -1)) px(ctx, x, y, '#e7c46a', 16, 2);
  if (!t.same(0, 1)) px(ctx, x, y + 14, '#e7c46a', 16, 2);
  if (!t.same(-1, 0)) px(ctx, x, y, '#e7c46a', 2, 16);
  if (!t.same(1, 0)) px(ctx, x + 14, y, '#e7c46a', 2, 16);
}

function mat(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, '#6e5a4a', 16, 16);
  px(ctx, x + 1, y + 2, '#8d755f', 14, 12);
  for (let i = 3; i < 14; i += 2) px(ctx, x + 2, y + i, '#7a6452', 12, 1);
}

function wall(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext) {
  const base = t.wallColor ?? '#e7dcc4';
  px(ctx, x, y, base, 16, 16);
  for (let i = 0; i < 16; i += 4) px(ctx, x + i, y, shade(base, -0.05), 1, 16);
  const below = t.kindAt(0, 1);
  if (below !== 'wall' && below !== 'void') {
    px(ctx, x, y + 12, '#8a6f58', 16, 4);
    px(ctx, x, y + 12, '#a88a6e', 16, 1);
  }
  const above = t.kindAt(0, -1);
  if (above === 'void' || above === null) {
    px(ctx, x, y, shade(base, -0.25), 16, 2);
  }
}

function voidTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x, y, '#2a2335', 16, 16);
}

function counter(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext, floor: (ctx: CanvasRenderingContext2D, x: number, y: number) => void) {
  floor(ctx, x, y);
  const left = !t.same(-1, 0), right = !t.same(1, 0);
  px(ctx, x, y + 2, '#3a2e2a', 16, 13);
  px(ctx, x + (left ? 1 : 0), y + 3, '#d6a874', 16 - (left ? 1 : 0) - (right ? 1 : 0), 5);
  px(ctx, x + (left ? 1 : 0), y + 3, '#e8c296', 16 - (left ? 1 : 0) - (right ? 1 : 0), 1);
  px(ctx, x + (left ? 1 : 0), y + 8, '#8f5f3c', 16 - (left ? 1 : 0) - (right ? 1 : 0), 6);
  px(ctx, x + (left ? 1 : 0), y + 9, '#a2704a', 16 - (left ? 1 : 0) - (right ? 1 : 0), 1);
}

export function drawGroundTile(ctx: CanvasRenderingContext2D, x: number, y: number, t: TileContext, defaultFloor: GroundKind): void {
  const r = rng(t.seed);
  const floorFn = (c: CanvasRenderingContext2D, xx: number, yy: number) => {
    if (defaultFloor === 'floor_wood') floorWood(c, xx, yy, rng(t.seed));
    else if (defaultFloor === 'floor_lab') floorLab(c, xx, yy, rng(t.seed));
    else floorClinic(c, xx, yy);
  };
  switch (t.kind) {
    case 'grass': return grass(ctx, x, y, r);
    case 'flowers': return flowers(ctx, x, y, r);
    case 'path': return path(ctx, x, y, t, r);
    case 'dirt': return dirt(ctx, x, y, t, r);
    case 'plaza': return plaza(ctx, x, y);
    case 'water': return water(ctx, x, y, t, r);
    case 'sand': return sand(ctx, x, y, r);
    case 'floor_clinic': return floorClinic(ctx, x, y);
    case 'floor_wood': return floorWood(ctx, x, y, r);
    case 'floor_lab': return floorLab(ctx, x, y, r);
    case 'rug': return rug(ctx, x, y, t);
    case 'mat': return mat(ctx, x, y);
    case 'wall': return wall(ctx, x, y, t);
    case 'void': return voidTile(ctx, x, y);
    case 'counter': return counter(ctx, x, y, t, floorFn);
  }
}
