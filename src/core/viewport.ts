/**
 * Escala da tela: o jogo ocupa toda a área disponível (retrato ou paisagem) e a câmera usa zoom inteiro,
 * mantendo a pixel art nítida. Em celulares, o zoom 2 mostra cerca de 11–12 tiles na menor dimensão.
 */
export const TARGET_SHORT_SIDE_PX = 192; // ~12 tiles de 16 px na menor dimensão

export function computeZoom(width: number, height: number): number {
  const short = Math.min(width, height);
  return Math.max(2, Math.min(6, Math.floor(short / TARGET_SHORT_SIDE_PX)));
}

/** Limites da câmera: centraliza mapas menores que a área visível. */
export function cameraBounds(mapW: number, mapH: number, viewW: number, viewH: number): { x: number; y: number; w: number; h: number } {
  return {
    x: mapW < viewW ? -(viewW - mapW) / 2 : 0,
    y: mapH < viewH ? -(viewH - mapH) / 2 : 0,
    w: Math.max(mapW, viewW),
    h: Math.max(mapH, viewH),
  };
}
