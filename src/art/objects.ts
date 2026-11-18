/**
 * Objetos do mundo (árvores, cercas, móveis, equipamentos) e prédios, desenhados proceduralmente.
 * Cada objeto define tamanho em pixels, área de colisão (em tiles) e é ordenado por profundidade.
 */
import { autoOutline, box, createCanvas, ctx2d, hashString, OUTLINE, px, rng, shade } from './pixel';

export interface ObjectArt {
  w: number; // px
  h: number; // px
  /** tiles bloqueados relativos ao tile-âncora (canto inferior esquerdo do sprite); dy <= 0 */
  blocks: [number, number][];
  draw: (ctx: CanvasRenderingContext2D, seed: number) => void;
  /** desenhar sob o jogador (decoração no chão/parede) */
  flat?: boolean;
  /** deslocamento horizontal do sprite em px (ex.: árvore centralizada no tile) */
  offsetX?: number;
}

function outlined(ctx: CanvasRenderingContext2D, w: number, h: number) { autoOutline(ctx, 0, 0, w, h); }

// ---------------- Exterior ----------------
function tree(ctx: CanvasRenderingContext2D, seed: number) {
  const r = rng(seed);
  const leaf = r() < 0.5 ? ['#3f8a45', '#2f6f37', '#58a85a', '#76c26e'] : ['#4b9142', '#36733a', '#67b357', '#8ccc72'];
  // tronco
  px(ctx, 10, 22, '#6e4a2f', 4, 9); px(ctx, 10, 22, '#8a6040', 1, 9); px(ctx, 9, 29, '#5a3c26', 6, 2);
  // copa em camadas circulares
  const blob = (cx: number, cy: number, rad: number, col: string) => {
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 1) px(ctx, cx + x, cy + y, col);
  };
  blob(12, 14, 10, leaf[1]);
  blob(11, 12, 9, leaf[0]);
  blob(9, 9, 5, leaf[2]);
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = r() * 8; px(ctx, Math.round(11 + Math.cos(a) * d), Math.round(12 + Math.sin(a) * d), leaf[r() < 0.5 ? 2 : 1]); }
  px(ctx, 7, 6, leaf[3], 2, 1); px(ctx, 6, 7, leaf[3], 1, 2); px(ctx, 13, 8, leaf[3], 2, 1);
  outlined(ctx, 24, 32);
}

function bush(ctx: CanvasRenderingContext2D, seed: number) {
  const r = rng(seed);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - 7.5, dy = y - 9;
    if (dx * dx / 49 + dy * dy / 36 <= 1) px(ctx, x, y, dy < -1 ? '#5cab55' : '#3f8a45');
  }
  for (let i = 0; i < 6; i++) px(ctx, 3 + Math.floor(r() * 10), 5 + Math.floor(r() * 8), '#7cc46a');
  if (r() < 0.6) { px(ctx, 5, 7, '#e8566a'); px(ctx, 10, 9, '#e8566a'); px(ctx, 7, 11, '#f4f0e6'); }
  outlined(ctx, 16, 16);
}

function fenceH(ctx: CanvasRenderingContext2D) {
  px(ctx, 0, 6, '#a4733f', 16, 2); px(ctx, 0, 10, '#a4733f', 16, 2);
  px(ctx, 0, 6, '#c08b52', 16, 1); px(ctx, 0, 10, '#c08b52', 16, 1);
  px(ctx, 2, 3, '#8b5e32', 3, 12); px(ctx, 11, 3, '#8b5e32', 3, 12);
  px(ctx, 2, 3, '#b07a44', 1, 12); px(ctx, 11, 3, '#b07a44', 1, 12);
  outlined(ctx, 16, 16);
}

function fenceV(ctx: CanvasRenderingContext2D) {
  px(ctx, 6, 0, '#8b5e32', 4, 16); px(ctx, 6, 0, '#b07a44', 1, 16);
  px(ctx, 5, 3, '#a4733f', 6, 2); px(ctx, 5, 11, '#a4733f', 6, 2);
  outlined(ctx, 16, 16);
}

function lamp(ctx: CanvasRenderingContext2D) {
  px(ctx, 7, 6, '#3b3f4f', 2, 22); px(ctx, 7, 6, '#5a6075', 1, 22);
  px(ctx, 5, 27, '#3b3f4f', 6, 3);
  px(ctx, 4, 1, '#3b3f4f', 8, 2); px(ctx, 5, 3, '#f8e9a8', 6, 3); px(ctx, 6, 3, '#fff8d8', 2, 2); px(ctx, 4, 6, '#3b3f4f', 8, 1);
  outlined(ctx, 16, 32);
}

function bench(ctx: CanvasRenderingContext2D) {
  px(ctx, 2, 4, '#9a6638', 28, 3); px(ctx, 2, 4, '#b98150', 28, 1);
  px(ctx, 2, 9, '#a8703f', 28, 3); px(ctx, 2, 9, '#c48d58', 28, 1);
  px(ctx, 4, 12, '#3b3f4f', 2, 3); px(ctx, 26, 12, '#3b3f4f', 2, 3);
  px(ctx, 4, 7, '#3b3f4f', 2, 2); px(ctx, 26, 7, '#3b3f4f', 2, 2);
  outlined(ctx, 32, 16);
}

function sign(ctx: CanvasRenderingContext2D) {
  px(ctx, 7, 9, '#7a5233', 2, 6);
  box(ctx, 1, 2, 14, 9, '#c8955c');
  px(ctx, 2, 3, '#ddb07a', 12, 1);
  px(ctx, 3, 5, '#7a5233', 10, 1); px(ctx, 3, 7, '#7a5233', 7, 1);
  outlined(ctx, 16, 16);
}

function fountain(ctx: CanvasRenderingContext2D) {
  // bacia circular 48x48
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x - 23.5, dy = (y - 26) * 1.15;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 21) px(ctx, x, y, d > 18 ? '#bdb6aa' : d > 16.5 ? '#9e968a' : '#4b93cf');
  }
  for (let i = 0; i < 10; i++) px(ctx, 10 + i * 3, 26 + (i % 3) * 3, '#8cc4ee', 2, 1);
  px(ctx, 20, 12, '#bdb6aa', 8, 16); px(ctx, 20, 12, '#d3cdc2', 2, 16);
  px(ctx, 16, 10, '#bdb6aa', 16, 4); px(ctx, 16, 10, '#d3cdc2', 16, 1);
  px(ctx, 23, 2, '#a8d4f2', 2, 8); px(ctx, 21, 4, '#a8d4f2', 1, 4); px(ctx, 26, 4, '#a8d4f2', 1, 4);
  outlined(ctx, 48, 48);
}

function flowerbed(ctx: CanvasRenderingContext2D, seed: number) {
  const r = rng(seed);
  box(ctx, 0, 6, 32, 10, '#8a5a3a');
  px(ctx, 1, 7, '#6b4228', 30, 2);
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(r() * 27), y = 3 + Math.floor(r() * 6);
    px(ctx, x, y + 2, '#3f8a45', 1, 3);
    const c = ['#e8566a', '#f1d24a', '#f4f0e6', '#b48ef0'][Math.floor(r() * 4)];
    px(ctx, x - 1, y + 1, c, 3, 1); px(ctx, x, y, c); px(ctx, x, y + 2, c);
  }
  outlined(ctx, 32, 16);
}

function gate(ctx: CanvasRenderingContext2D) {
  px(ctx, 0, 2, '#4a4f60', 3, 28); px(ctx, 29, 2, '#4a4f60', 3, 28);
  for (let x = 4; x < 29; x += 4) px(ctx, x, 6, '#6a7086', 2, 22);
  px(ctx, 3, 6, '#5a6075', 26, 2); px(ctx, 3, 24, '#5a6075', 26, 2);
  px(ctx, 12, 12, '#c8373a', 8, 6); px(ctx, 13, 13, '#f4f0e6', 6, 1); px(ctx, 13, 15, '#f4f0e6', 6, 1);
  outlined(ctx, 32, 32);
}

function hay(ctx: CanvasRenderingContext2D) {
  box(ctx, 1, 4, 14, 11, '#e2c25c');
  for (let y = 6; y < 14; y += 2) px(ctx, 2, y, '#c9a743', 12, 1);
  px(ctx, 4, 4, '#a8862e', 1, 11); px(ctx, 11, 4, '#a8862e', 1, 11);
  outlined(ctx, 16, 16);
}

function trough(ctx: CanvasRenderingContext2D) {
  box(ctx, 1, 5, 30, 9, '#8a6a4a');
  px(ctx, 3, 6, '#4b93cf', 26, 3);
  px(ctx, 3, 12, '#5a3c26', 2, 3); px(ctx, 27, 12, '#5a3c26', 2, 3);
  outlined(ctx, 32, 16);
}

function bigSign(ctx: CanvasRenderingContext2D) {
  // placa de entrada da universidade 48x32
  px(ctx, 4, 18, '#6e4a2f', 3, 13); px(ctx, 41, 18, '#6e4a2f', 3, 13);
  box(ctx, 0, 2, 48, 18, '#2f6f5e');
  px(ctx, 1, 3, '#3f8f78', 46, 2);
  px(ctx, 6, 8, '#f4f0e6', 36, 1); px(ctx, 10, 11, '#f4f0e6', 28, 1); px(ctx, 14, 14, '#e7c46a', 20, 1);
  // cruz veterinária
  px(ctx, 3, 9, '#f4f0e6', 1, 5); px(ctx, 1, 11, '#f4f0e6', 5, 1);
  outlined(ctx, 48, 32);
}

// ---------------- Interior ----------------
function examTable(ctx: CanvasRenderingContext2D) {
  px(ctx, 3, 14, '#6b7385', 2, 9); px(ctx, 27, 14, '#6b7385', 2, 9);
  box(ctx, 0, 4, 32, 12, '#c9d3dc');
  px(ctx, 1, 5, '#e6edf2', 30, 2);
  px(ctx, 1, 13, '#9ba7b4', 30, 2);
  outlined(ctx, 32, 24);
}

function cabinet(ctx: CanvasRenderingContext2D, seed: number) {
  const r = rng(seed);
  box(ctx, 0, 2, 16, 30, '#eef2f4');
  px(ctx, 2, 4, '#9fc4d8', 12, 11); px(ctx, 7, 4, '#c3d7e2', 1, 11);
  for (let i = 0; i < 4; i++) {
    const c = ['#d65a5a', '#5aa0d6', '#e7c46a', '#7cc46a'][Math.floor(r() * 4)];
    px(ctx, 3 + i * 3, 7 + (i % 2) * 4, c, 2, 3);
  }
  px(ctx, 2, 17, '#d5dde2', 12, 13); px(ctx, 7, 22, '#8a96a6', 2, 2);
  outlined(ctx, 16, 32);
}

function bookshelf(ctx: CanvasRenderingContext2D, seed: number) {
  const r = rng(seed);
  box(ctx, 0, 0, 32, 32, '#7a5233');
  for (let s = 0; s < 3; s++) {
    const y = 3 + s * 9;
    px(ctx, 2, y, '#3e2a1c', 28, 7);
    let x = 2;
    while (x < 29) {
      const w = 2 + Math.floor(r() * 2);
      const h = 5 + Math.floor(r() * 2);
      const c = ['#c8373a', '#3d6fb6', '#3f9d76', '#e7c46a', '#8c2f45', '#6a4a9c', '#e3e0d6'][Math.floor(r() * 7)];
      px(ctx, x, y + 7 - h, c, w, h); px(ctx, x, y + 7 - h, shade(c, 0.25), 1, h);
      x += w + (r() < 0.15 ? 1 : 0);
    }
    px(ctx, 1, y + 7, '#9a6a44', 30, 2);
  }
  outlined(ctx, 32, 32);
}

function plant(ctx: CanvasRenderingContext2D) {
  box(ctx, 4, 15, 8, 9, '#c0643a'); px(ctx, 5, 16, '#d8804f', 6, 1);
  const leaves: [number, number, number][] = [[8, 3, 0], [4, 6, -1], [12, 6, 1], [6, 9, -1], [10, 9, 1], [8, 7, 0]];
  for (const [x, y, d] of leaves) {
    px(ctx, x - 1, y, '#3f8a45', 3, 4); px(ctx, x - 1 + d, y - 1, '#5cab55', 2, 2); px(ctx, x, y + 3, '#2f6f37', 1, 4);
  }
  outlined(ctx, 16, 24);
}

function chairRow(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 2; i++) {
    const x = i * 16;
    px(ctx, x + 2, 2, '#3d6fb6', 12, 7); px(ctx, x + 2, 2, '#5a8ad0', 12, 1);
    px(ctx, x + 2, 9, '#2b5088', 12, 4);
    px(ctx, x + 3, 13, '#4a4f60', 2, 3); px(ctx, x + 11, 13, '#4a4f60', 2, 3);
  }
  outlined(ctx, 32, 16);
}

function desk(ctx: CanvasRenderingContext2D) {
  px(ctx, 2, 18, '#5a3c26', 2, 6); px(ctx, 28, 18, '#5a3c26', 2, 6);
  box(ctx, 0, 10, 32, 9, '#b98654'); px(ctx, 1, 11, '#d0a06d', 30, 1);
  box(ctx, 9, 0, 14, 10, '#3a3f50'); px(ctx, 10, 1, '#6fb0e8', 12, 7); px(ctx, 11, 2, '#a8d4f2', 4, 1);
  px(ctx, 15, 10, '#3a3f50', 2, 1);
  px(ctx, 4, 13, '#e3e0d6', 6, 2);
  outlined(ctx, 32, 24);
}

function sink(ctx: CanvasRenderingContext2D) {
  box(ctx, 0, 8, 16, 16, '#d9e1e6');
  px(ctx, 2, 10, '#9fb0bd', 12, 4); px(ctx, 3, 11, '#bfe0f4', 10, 2);
  px(ctx, 7, 3, '#8a96a6', 2, 6); px(ctx, 7, 3, '#b8c3cf', 5, 2);
  px(ctx, 2, 17, '#b8c3cf', 12, 6);
  outlined(ctx, 16, 24);
}

function microscopeBench(ctx: CanvasRenderingContext2D) {
  px(ctx, 2, 18, '#4a4f60', 2, 6); px(ctx, 28, 18, '#4a4f60', 2, 6);
  box(ctx, 0, 10, 32, 9, '#e9eef0'); px(ctx, 1, 11, '#ffffff', 30, 1);
  // microscópio
  px(ctx, 7, 8, '#3a3f50', 8, 3); px(ctx, 12, 1, '#3a3f50', 3, 8); px(ctx, 9, 2, '#5a6075', 4, 2); px(ctx, 8, 5, '#3a3f50', 6, 1);
  px(ctx, 13, 0, '#8a96a6', 1, 2);
  // lâminas e frascos
  px(ctx, 19, 12, '#bfe0f4', 5, 2); px(ctx, 25, 7, '#d65a5a', 2, 5); px(ctx, 28, 8, '#5aa0d6', 2, 4);
  outlined(ctx, 32, 24);
}

function skeletonDisplay(ctx: CanvasRenderingContext2D) {
  // pedestal com esqueleto de cão estilizado 32x32
  box(ctx, 2, 22, 28, 10, '#7a5233'); px(ctx, 3, 23, '#9a6a44', 26, 1);
  px(ctx, 6, 20, '#4a4f60', 20, 2);
  const b = '#efe6cf', d = '#c9bea2';
  px(ctx, 22, 6, b, 6, 4); px(ctx, 27, 8, b, 3, 2); px(ctx, 23, 9, d, 5, 1); // crânio
  px(ctx, 9, 9, b, 14, 2); // coluna
  for (let i = 0; i < 5; i++) px(ctx, 11 + i * 2, 11, d, 1, 4); // costelas
  px(ctx, 6, 8, b, 4, 3); px(ctx, 3, 6, b, 4, 1); px(ctx, 2, 5, b, 1, 1); // pelve e cauda
  px(ctx, 19, 11, b, 2, 9); px(ctx, 16, 11, b, 2, 9); // membros torácicos
  px(ctx, 7, 11, b, 2, 9); px(ctx, 10, 11, b, 2, 9); // membros pélvicos
  outlined(ctx, 32, 32);
}

function skullDisplay(ctx: CanvasRenderingContext2D) {
  box(ctx, 1, 12, 14, 12, '#7a5233');
  px(ctx, 2, 13, '#9a6a44', 12, 1);
  const b = '#efe6cf';
  px(ctx, 3, 4, b, 10, 6); px(ctx, 5, 10, b, 6, 2); px(ctx, 2, 2, b, 2, 3); px(ctx, 12, 2, b, 2, 3); // crânio bovino com cornos
  px(ctx, 5, 6, '#3a3236', 2, 2); px(ctx, 9, 6, '#3a3236', 2, 2);
  outlined(ctx, 16, 24);
}

function whiteboard(ctx: CanvasRenderingContext2D) {
  box(ctx, 0, 1, 32, 14, '#f7f9fa');
  px(ctx, 3, 4, '#3d6fb6', 12, 1); px(ctx, 3, 6, '#3d6fb6', 9, 1); px(ctx, 3, 8, '#c8373a', 14, 1);
  px(ctx, 20, 4, '#3a3f50', 8, 6); px(ctx, 21, 5, '#efe6cf', 6, 4);
  px(ctx, 2, 13, '#8a96a6', 28, 1);
  outlined(ctx, 32, 16);
}

function poster(ctx: CanvasRenderingContext2D, seed: number) {
  const r = rng(seed);
  const c = ['#3f9d76', '#3d6fb6', '#d98f4e', '#8a6bc9'][Math.floor(r() * 4)];
  box(ctx, 2, 1, 12, 14, '#f4f0e6');
  px(ctx, 3, 2, c, 10, 4);
  px(ctx, 4, 8, '#7a7a8a', 8, 1); px(ctx, 4, 10, '#7a7a8a', 6, 1); px(ctx, 4, 12, '#7a7a8a', 7, 1);
  outlined(ctx, 16, 16);
}

function xrayViewer(ctx: CanvasRenderingContext2D) {
  box(ctx, 0, 1, 16, 13, '#3a3f50');
  px(ctx, 2, 3, '#cfe6f4', 12, 9);
  px(ctx, 5, 5, '#f4fbff', 6, 1); px(ctx, 7, 4, '#f4fbff', 1, 7); px(ctx, 5, 7, '#f4fbff', 6, 1); px(ctx, 5, 9, '#f4fbff', 6, 1);
  outlined(ctx, 16, 16);
}

function doorLocked(ctx: CanvasRenderingContext2D) {
  box(ctx, 1, 2, 14, 30, '#8a6a52');
  px(ctx, 3, 4, '#a2826a', 10, 12); px(ctx, 3, 18, '#a2826a', 10, 12);
  px(ctx, 11, 17, '#e7c46a', 2, 2);
  px(ctx, 4, 7, '#cfe6f4', 8, 5);
  outlined(ctx, 16, 32);
}

function fridge(ctx: CanvasRenderingContext2D) {
  box(ctx, 0, 0, 16, 32, '#e8edf0');
  px(ctx, 1, 12, '#b8c3cf', 14, 1);
  px(ctx, 12, 4, '#8a96a6', 1, 6); px(ctx, 12, 15, '#8a96a6', 1, 8);
  px(ctx, 3, 3, '#5aa0d6', 4, 3);
  outlined(ctx, 16, 32);
}

function tableChairs(ctx: CanvasRenderingContext2D) {
  // mesa de estudo 32x24 com cadeiras
  px(ctx, 4, 0, '#7a5233', 8, 5); px(ctx, 20, 0, '#7a5233', 8, 5);
  box(ctx, 0, 4, 32, 12, '#b98654'); px(ctx, 1, 5, '#d0a06d', 30, 1);
  px(ctx, 5, 8, '#f4f0e6', 7, 5); px(ctx, 8, 8, '#c8c0b0', 1, 5); px(ctx, 19, 9, '#3d6fb6', 6, 4);
  px(ctx, 2, 16, '#5a3c26', 2, 6); px(ctx, 28, 16, '#5a3c26', 2, 6);
  outlined(ctx, 32, 24);
}

function reviewTerminal(ctx: CanvasRenderingContext2D) {
  box(ctx, 2, 10, 12, 14, '#4a5160');
  box(ctx, 0, 0, 16, 12, '#3a3f50');
  px(ctx, 2, 2, '#7ce0b0', 12, 8); px(ctx, 3, 3, '#c8f5df', 5, 1); px(ctx, 3, 5, '#c8f5df', 8, 1); px(ctx, 3, 7, '#c8f5df', 4, 1);
  outlined(ctx, 16, 24);
}

function carrier(ctx: CanvasRenderingContext2D) {
  box(ctx, 1, 4, 14, 11, '#6fb0e8');
  px(ctx, 2, 5, '#9fcdf2', 12, 2);
  px(ctx, 4, 8, '#2b5088', 8, 5); for (let x = 5; x < 12; x += 2) px(ctx, x, 8, '#9fcdf2', 1, 5);
  px(ctx, 5, 2, '#2b5088', 6, 2);
  outlined(ctx, 16, 16);
}

export const OBJECTS: Record<string, ObjectArt> = {
  tree: { w: 24, h: 32, blocks: [[0, 0]], draw: tree, offsetX: -4 },
  bush: { w: 16, h: 16, blocks: [[0, 0]], draw: bush },
  fence_h: { w: 16, h: 16, blocks: [[0, 0]], draw: fenceH },
  fence_v: { w: 16, h: 16, blocks: [[0, 0]], draw: fenceV },
  lamp: { w: 16, h: 32, blocks: [[0, 0]], draw: lamp },
  bench: { w: 32, h: 16, blocks: [[0, 0], [1, 0]], draw: bench },
  sign: { w: 16, h: 16, blocks: [[0, 0]], draw: sign },
  fountain: { w: 48, h: 48, blocks: [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, -1]], draw: fountain },
  flowerbed: { w: 32, h: 16, blocks: [[0, 0], [1, 0]], draw: flowerbed },
  gate: { w: 32, h: 32, blocks: [[0, 0], [1, 0]], draw: gate },
  hay: { w: 16, h: 16, blocks: [[0, 0]], draw: hay },
  trough: { w: 32, h: 16, blocks: [[0, 0], [1, 0]], draw: trough },
  big_sign: { w: 48, h: 32, blocks: [[0, 0], [2, 0]], draw: bigSign },
  exam_table: { w: 32, h: 24, blocks: [[0, 0], [1, 0]], draw: examTable },
  cabinet: { w: 16, h: 32, blocks: [[0, 0]], draw: cabinet },
  bookshelf: { w: 32, h: 32, blocks: [[0, 0], [1, 0]], draw: bookshelf },
  plant: { w: 16, h: 24, blocks: [[0, 0]], draw: plant },
  chairs: { w: 32, h: 16, blocks: [[0, 0], [1, 0]], draw: chairRow },
  desk: { w: 32, h: 24, blocks: [[0, 0], [1, 0]], draw: desk },
  sink: { w: 16, h: 24, blocks: [[0, 0]], draw: sink },
  microscope_bench: { w: 32, h: 24, blocks: [[0, 0], [1, 0]], draw: microscopeBench },
  skeleton: { w: 32, h: 32, blocks: [[0, 0], [1, 0]], draw: skeletonDisplay },
  skull: { w: 16, h: 24, blocks: [[0, 0]], draw: skullDisplay },
  whiteboard: { w: 32, h: 16, blocks: [], draw: whiteboard, flat: true },
  poster: { w: 16, h: 16, blocks: [], draw: poster, flat: true },
  xray: { w: 16, h: 16, blocks: [], draw: xrayViewer, flat: true },
  door_locked: { w: 16, h: 32, blocks: [[0, 0]], draw: doorLocked, flat: true },
  fridge: { w: 16, h: 32, blocks: [[0, 0]], draw: fridge },
  study_table: { w: 32, h: 24, blocks: [[0, 0], [1, 0]], draw: tableChairs },
  terminal: { w: 16, h: 24, blocks: [[0, 0]], draw: reviewTerminal },
  carrier: { w: 16, h: 16, blocks: [[0, 0]], draw: carrier },
};

export function renderObject(type: string, seed: number): HTMLCanvasElement {
  const def = OBJECTS[type];
  if (!def) throw new Error(`Objeto desconhecido: ${type}`);
  const c = createCanvas(def.w, def.h);
  def.draw(ctx2d(c), seed);
  return c;
}

// ---------------- Prédios ----------------
export interface BuildingStyle {
  roof: string;
  wall: string;
  trim: string;
  icon: 'cross' | 'bone' | 'book' | 'flask' | 'board' | 'paw' | 'barn' | 'heart' | 'bug' | 'pill' | 'microscope' | 'scalpel' | 'globe';
  accent: string;
}

function drawIcon(ctx: CanvasRenderingContext2D, x: number, y: number, icon: BuildingStyle['icon'], color: string) {
  const w = '#f4f0e6';
  switch (icon) {
    case 'cross': px(ctx, x + 3, y + 1, w, 2, 6); px(ctx, x + 1, y + 3, w, 6, 2); break;
    case 'bone': px(ctx, x + 2, y + 3, w, 4, 2); px(ctx, x + 1, y + 2, w, 2, 2); px(ctx, x + 1, y + 4, w, 2, 2); px(ctx, x + 5, y + 2, w, 2, 2); px(ctx, x + 5, y + 4, w, 2, 2); break;
    case 'book': px(ctx, x + 1, y + 2, w, 6, 5); px(ctx, x + 4, y + 2, color, 1, 5); break;
    case 'flask': px(ctx, x + 3, y + 1, w, 2, 3); px(ctx, x + 2, y + 4, w, 4, 3); px(ctx, x + 1, y + 6, w, 6, 1); break;
    case 'board': px(ctx, x + 1, y + 2, w, 6, 4); px(ctx, x + 3, y + 6, w, 2, 2); break;
    case 'paw': px(ctx, x + 2, y + 4, w, 4, 3); px(ctx, x + 1, y + 2, w, 1, 2); px(ctx, x + 3, y + 1, w, 1, 2); px(ctx, x + 5, y + 1, w, 1, 2); px(ctx, x + 7, y + 2, w, 1, 2); break;
    case 'barn': px(ctx, x + 1, y + 3, w, 6, 4); px(ctx, x + 2, y + 2, w, 4, 1); px(ctx, x + 3, y + 1, w, 2, 1); break;
    case 'heart': px(ctx, x + 1, y + 2, w, 2, 2); px(ctx, x + 5, y + 2, w, 2, 2); px(ctx, x + 1, y + 3, w, 6, 2); px(ctx, x + 2, y + 5, w, 4, 1); px(ctx, x + 3, y + 6, w, 2, 1); break;
    case 'bug': px(ctx, x + 3, y + 1, w, 2, 1); px(ctx, x + 2, y + 2, w, 4, 5); px(ctx, x + 1, y + 3, w, 1, 1); px(ctx, x + 6, y + 3, w, 1, 1); px(ctx, x + 1, y + 5, w, 1, 1); px(ctx, x + 6, y + 5, w, 1, 1); px(ctx, x + 4, y + 2, color, 1, 5); break;
    case 'pill': px(ctx, x + 1, y + 3, w, 6, 3); px(ctx, x + 2, y + 2, w, 4, 1); px(ctx, x + 2, y + 6, w, 4, 1); px(ctx, x + 4, y + 2, color, 1, 5); break;
    case 'microscope': px(ctx, x + 3, y + 1, w, 2, 3); px(ctx, x + 2, y + 4, w, 3, 1); px(ctx, x + 5, y + 3, w, 1, 3); px(ctx, x + 1, y + 6, w, 6, 1); break;
    case 'scalpel': px(ctx, x + 1, y + 6, w, 3, 1); px(ctx, x + 3, y + 5, w, 2, 1); px(ctx, x + 4, y + 3, w, 2, 2); px(ctx, x + 5, y + 1, w, 2, 2); break;
    case 'globe': px(ctx, x + 2, y + 1, w, 4, 6); px(ctx, x + 1, y + 2, w, 6, 4); px(ctx, x + 2, y + 3, color, 2, 2); px(ctx, x + 5, y + 2, color, 1, 2); break;
  }
}

/**
 * Prédio com telhado e fachada. `doors` são colunas (em tiles) das portas na última linha.
 * O telhado ocupa ~metade superior; a fachada tem janelas e uma placa com ícone sobre a porta principal.
 */
export function renderBuilding(wT: number, hT: number, style: BuildingStyle, doors: number[], seedKey: string): HTMLCanvasElement {
  const W = wT * 16, H = hT * 16;
  const c = createCanvas(W, H);
  const ctx = ctx2d(c);
  const r = rng(hashString(seedKey));
  const roofH = Math.max(24, Math.floor(H * 0.48));
  // fachada
  px(ctx, 0, roofH, style.wall, W, H - roofH);
  for (let y = roofH + 3; y < H; y += 6) px(ctx, 0, y, shade(style.wall, -0.06), W, 1);
  px(ctx, 0, H - 4, shade(style.wall, -0.35), W, 4);
  px(ctx, 0, roofH, shade(style.wall, -0.25), W, 2);
  // telhado com telhas
  for (let y = 0; y < roofH; y++) {
    const inset = Math.max(0, 6 - y);
    const rowCol = Math.floor(y / 4) % 2 === 0 ? style.roof : shade(style.roof, -0.1);
    px(ctx, inset, y, rowCol, W - inset * 2, 1);
  }
  for (let y = 3; y < roofH; y += 4) {
    const off = (y / 4) % 2 === 0 ? 0 : 4;
    for (let x = off; x < W; x += 8) px(ctx, x, y - 3, shade(style.roof, -0.25), 1, 3);
    px(ctx, 0, y, shade(style.roof, -0.3), W, 1);
  }
  px(ctx, 6, 0, shade(style.roof, 0.25), W - 12, 2);
  px(ctx, 0, roofH - 3, style.trim, W, 3);
  px(ctx, 0, roofH - 3, shade(style.trim, 0.2), W, 1);
  // janelas
  const winY = roofH + 6;
  const winH = Math.min(14, H - roofH - 14);
  for (let tx = 0; tx < wT; tx++) {
    if (doors.includes(tx)) continue;
    if (winH < 6) break;
    const x = tx * 16 + 3;
    box(ctx, x, winY, 10, winH, '#9fd0ec');
    px(ctx, x + 1, winY + 1, '#d6efff', 3, 1);
    px(ctx, x + 5, winY + 1, shade('#9fd0ec', -0.15), 1, winH - 2);
    px(ctx, x - 1, winY + winH, style.trim, 12, 2);
    if (r() < 0.35) { px(ctx, x + 1, winY + winH - 3, '#5cab55', 8, 2); px(ctx, x + 2, winY + winH - 4, '#e8566a', 1, 1); px(ctx, x + 6, winY + winH - 4, '#f1d24a', 1, 1); }
  }
  // portas
  doors.forEach((tx, i) => {
    const x = tx * 16;
    px(ctx, x + 1, H - 22, OUTLINE, 14, 22);
    px(ctx, x + 2, H - 21, '#7a5233', 12, 21);
    px(ctx, x + 2, H - 21, '#9a6a44', 5, 21);
    px(ctx, x + 8, H - 21, '#8a5e3b', 6, 21);
    px(ctx, x + 3, H - 18, '#bfe0f4', 3, 6); px(ctx, x + 9, H - 18, '#bfe0f4', 3, 6);
    px(ctx, x + 7, H - 10, '#e7c46a', 1, 2);
    if (i === 0) {
      // placa
      const sx = x - 4, sy = roofH + 1;
      box(ctx, sx, sy, 24, 12, style.accent);
      drawIcon(ctx, sx + 8, sy + 2, style.icon, style.accent);
    }
  });
  autoOutline(ctx, 0, 0, W, H);
  // contorno nas bordas do canvas
  px(ctx, 0, roofH, OUTLINE, 1, H - roofH); px(ctx, W - 1, roofH, OUTLINE, 1, H - roofH); px(ctx, 0, H - 1, OUTLINE, W, 1);
  return c;
}
