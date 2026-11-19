/** Casa do personagem (moradia estudantil no campus): cama para dormir e cantinho dos pets. */
import type { MapDef } from '../mapTypes';

const W = 14;
const tiles = [
  '#' + 'W'.repeat(W - 2) + '#',
  '#' + 'W'.repeat(W - 2) + '#',
  '#____________#',
  '#____,,,,____#',
  '#____,,,,____#',
  '#____,,,,____#',
  '#____________#',
  '#____________#',
  '#____________#',
  '#'.repeat(6) + 'mm' + '#'.repeat(W - 8),
];

export const casa: MapDef = {
  id: 'casa',
  name: 'Sua casa',
  kind: 'indoor',
  music: 'lab',
  width: W,
  height: tiles.length,
  tiles,
  floor: 'floor_wood',
  wallColor: '#efe0c8',
  buildings: [],
  objects: [
    { type: 'bed', x: 1, y: 3, interact: { dialogue: 'cama' } },
    { type: 'desk', x: 4, y: 2, interact: { lines: ['Seu computador. Aqui você pode ver e exportar o seu desempenho acadêmico.'], effects: [{ type: 'openPanel', panel: 'performance' }] } },
    { type: 'bookshelf', x: 9, y: 2, seed: 33, interact: { lines: ['Seus livros e anotações da faculdade. O VetiDex (V) guarda tudo o que você já estudou.'] } },
    { type: 'poster', x: 7, y: 1, seed: 34, interact: { lines: ['Um calendário na parede. Dormir faz o tempo passar: novos pacientes chegam a cada manhã.'] } },
    { type: 'pet_bed', x: 12, y: 7, interact: { lines: ['O cantinho dos pets, com caminha, água fresca e brinquedos.'], effects: [{ type: 'openPanel', panel: 'pets' }] } },
    { type: 'plant', x: 12, y: 2 },
    { type: 'plant', x: 1, y: 8 },
  ],
  warps: [
    { fromX: 6, fromY: 9, map: 'campus', x: 15, y: 26, facing: 'down' },
    { fromX: 7, fromY: 9, map: 'campus', x: 15, y: 26, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 6, y: 8, facing: 'up' },
};

/** Posições dos pets em casa (o companheiro segue o jogador; os demais ficam aqui). */
export const HOME_PET_SPOTS: [number, number][] = [[4, 6], [9, 5], [10, 7], [3, 7]];
