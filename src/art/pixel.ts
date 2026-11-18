/**
 * Utilitários de pixel art: renderização de templates de caracteres, contorno automático,
 * espelhamento e RNG determinístico (para texturas estáveis entre execuções).
 * Toda a arte do MVP é gerada por código — pode ser substituída por spritesheets profissionais
 * registrando texturas com as mesmas chaves (ver docs/ARTE.md).
 */

export const OUTLINE = '#241b2b';

export type ColorMap = Record<string, string | null | undefined>;

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Desenha um template (array de strings) em (ox, oy). '.' e ' ' são transparentes. */
export function drawTemplate(ctx: CanvasRenderingContext2D, rows: string[], colors: ColorMap, ox = 0, oy = 0, mirror = false): void {
  const w = Math.max(...rows.map((r) => r.length));
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = colors[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      const dx = mirror ? w - 1 - x : x;
      ctx.fillRect(ox + dx, oy + y, 1, 1);
    }
  }
}

/** Adiciona contorno de 1px em volta dos pixels opacos dentro do retângulo (x,y,w,h). */
export function autoOutline(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, color = OUTLINE): void {
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const toPaint: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) toPaint.push([x, y]);
    }
  }
  ctx.fillStyle = color;
  for (const [x, y] of toPaint) ctx.fillRect(x0 + x, y0 + y, 1, 1);
}

/** Aplica escurecimento/clareamento em cor hexadecimal (amount -1..1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amount < 0) {
    r = Math.round(r * (1 + amount)); g = Math.round(g * (1 + amount)); b = Math.round(b * (1 + amount));
  } else {
    r = Math.round(r + (255 - r) * amount); g = Math.round(g + (255 - g) * amount); b = Math.round(b + (255 - b) * amount);
  }
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** RNG determinístico (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Retângulo com contorno de 1px. */
export function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, outline = OUTLINE): void {
  px(ctx, x, y, outline, w, h);
  px(ctx, x + 1, y + 1, fill, w - 2, h - 2);
}
