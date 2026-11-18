/**
 * Constrói a camada de chão (canvas único), a grade de colisões e o índice de interações de um mapa.
 * Parte puramente lógica (colisões) é separada para ser testada em Node (tests/maps.test.ts).
 */
import { LEGEND, type MapDef, type InteractionDef, type BuildingDef } from './mapTypes';
import { OBJECTS } from '../art/objects';
import type { GroundKind } from '../art/tiles';

export interface CollisionInfo {
  blocked: boolean[][];
  talkThrough: boolean[][];
  /** interações indexadas por "x,y" */
  interactions: Map<string, InteractionDef>;
  /** portas: "x,y" -> definição */
  doors: Map<string, { building: BuildingDef; door: BuildingDef['doors'][number] }>;
  warps: Map<string, { map: string; x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' }>;
}

export const key = (x: number, y: number) => `${x},${y}`;

export function groundKindAt(map: MapDef, x: number, y: number): GroundKind | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  const ch = map.tiles[y][x];
  const leg = LEGEND[ch];
  if (!leg) return map.kind === 'outdoor' ? 'grass' : 'void';
  return leg.kind === 'floor' ? (map.floor ?? 'floor_clinic') : leg.kind;
}

/** Porta trancada? (sem condição = sempre trancada; com condição = trancada enquanto a condição for verdadeira) */
export function isDoorLocked(door: BuildingDef['doors'][number], check: (c: any) => boolean): boolean {
  if (!door.locked) return false;
  if (!door.locked.when) return true;
  return check(door.locked.when);
}

export function buildCollision(map: MapDef, check: (c: any) => boolean = () => true): CollisionInfo {
  const blocked: boolean[][] = [];
  const talkThrough: boolean[][] = [];
  for (let y = 0; y < map.height; y++) {
    blocked.push([]);
    talkThrough.push([]);
    for (let x = 0; x < map.width; x++) {
      const leg = LEGEND[map.tiles[y][x]];
      blocked[y].push(!!leg?.block);
      talkThrough[y].push(!!leg?.talkThrough);
    }
  }
  const block = (x: number, y: number) => { if (y >= 0 && y < map.height && x >= 0 && x < map.width) blocked[y][x] = true; };
  const interactions = new Map<string, InteractionDef>();
  const doors = new Map<string, { building: BuildingDef; door: BuildingDef['doors'][number] }>();
  const warps = new Map<string, { map: string; x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' }>();

  for (const b of map.buildings) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) block(x, y);
    for (const d of b.doors) {
      const dx = b.x + d.dx, dy = b.y + b.h - 1;
      doors.set(key(dx, dy), { building: b, door: d });
      if (!isDoorLocked(d, check) && d.warp) {
        blocked[dy][dx] = false;
        warps.set(key(dx, dy), d.warp);
      }
    }
  }
  for (const o of map.objects) {
    if (o.presentWhen && !check(o.presentWhen)) continue; // objeto removido (ex.: portão aberto)
    const art = OBJECTS[o.type];
    if (!art) throw new Error(`Objeto desconhecido no mapa ${map.id}: ${o.type}`);
    for (const [bx, by] of art.blocks) block(o.x + bx, o.y + by);
    if (o.interact) {
      const tiles = art.blocks.length ? art.blocks.map(([bx, by]) => [o.x + bx, o.y + by]) : [[o.x, o.y]];
      for (const [tx, ty] of tiles) interactions.set(key(tx, ty), o.interact);
    }
  }
  for (const [k, v] of Object.entries(map.interactions)) interactions.set(k, v);
  for (const w of map.warps) warps.set(key(w.fromX, w.fromY), { map: w.map, x: w.x, y: w.y, facing: w.facing });
  return { blocked, talkThrough, interactions, doors, warps };
}

/** Lista de objetos implícitos gerados a partir de caracteres de tile (árvores, arbustos, cercas). */
export function implicitObjects(map: MapDef): { type: string; x: number; y: number; seed: number }[] {
  const out: { type: string; x: number; y: number; seed: number }[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const leg = LEGEND[map.tiles[y][x]];
      if (!leg?.object) continue;
      let type = leg.object;
      if (type === 'fence') {
        const isF = (xx: number, yy: number) => { const l = LEGEND[map.tiles[yy]?.[xx] ?? '']; return l?.object === 'fence'; };
        type = isF(x - 1, y) || isF(x + 1, y) ? 'fence_h' : 'fence_v';
      }
      out.push({ type, x, y, seed: x * 7919 + y * 104729 });
    }
  }
  return out;
}
