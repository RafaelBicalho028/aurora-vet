import type { MapDef } from '../mapTypes';
import { campus } from './campus';
import { anatomia, biblioteca, hospital } from './interiors';
import { cirurgia, farmacologia, fisiologia, institutos, microbiologia, parasitologia, patologia, saude_publica } from './institutos';

export const MAPS: Record<string, MapDef> = {
  campus, hospital, anatomia, biblioteca, institutos,
  fisiologia, microbiologia, parasitologia, farmacologia, patologia, cirurgia, saude_publica,
};

export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Mapa inexistente: ${id}`);
  return m;
}
