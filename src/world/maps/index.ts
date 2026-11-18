import type { MapDef } from '../mapTypes';
import { campus } from './campus';
import { anatomia, biblioteca, hospital } from './interiors';

export const MAPS: Record<string, MapDef> = { campus, hospital, anatomia, biblioteca };

export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Mapa inexistente: ${id}`);
  return m;
}
