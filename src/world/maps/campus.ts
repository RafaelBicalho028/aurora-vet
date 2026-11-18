/**
 * Campus da Universidade Veterinária de Aurora (mapa externo).
 * O layout é montado por um construtor simples para manter as linhas legíveis e consistentes.
 */
import type { BuildingStyle } from '../../art/objects';
import type { MapDef } from '../mapTypes';
import { rng } from '../../art/pixel';

const W = 44;
const H = 34;

function build(): string[] {
  const g: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const fill = (x: number, y: number, w: number, h: number, c: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };

  // Flores espalhadas (determinístico)
  const r = rng(42);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < 0.05) set(x, y, '"');

  // Bordas de árvores
  fill(0, 0, W, 2, 'T');
  fill(0, 0, 2, H, 'T');
  fill(W - 2, 0, 2, H, 'T');
  fill(0, H - 2, W, 2, 'T');

  // Avenida principal (N-S) e ruas
  fill(21, 9, 2, H - 9, '=');
  fill(0, 17, W, 2, '=');
  fill(4, 27, 36, 2, '=');
  fill(7, 16, 1, 1, '=');   // porta do lab. de anatomia
  fill(36, 16, 1, 1, '=');  // porta da biblioteca
  fill(7, 26, 1, 1, '=');   // salas de aula
  fill(36, 26, 1, 1, '=');  // laboratórios
  fill(20, 32, 4, 2, '=');  // saída sul (Vila)
  // Praça central
  fill(17, 11, 10, 8, 'p');
  // Lagoa (noroeste)
  fill(3, 3, 7, 4, '~');
  fill(4, 7, 5, 1, '~');
  // Fazenda-escola (nordeste): pasto de terra com cerca
  fill(31, 3, 10, 5, '-');
  for (let x = 30; x <= 41; x++) { set(x, 2, 'F'); set(x, 8, 'F'); }
  for (let y = 2; y <= 8; y++) { set(30, y, 'F'); set(41, y, 'F'); }
  fill(31, 9, 1, 1, '-'); fill(29, 9, 3, 1, '-');
  fill(23, 9, 7, 1, '-');
  // saídas leste e oeste
  set(0, 17, '='); set(1, 17, '='); set(0, 18, '='); set(1, 18, '=');
  set(42, 17, '='); set(43, 17, 'P'); set(42, 18, '='); set(43, 18, 'P');
  // Árvores e arbustos decorativos
  const trees: [number, number][] = [[13, 3], [14, 6], [12, 9], [3, 9], [2, 13], [14, 13], [14, 20], [12, 23], [29, 12], [30, 14], [29, 20], [31, 23], [42, 11], [27, 30], [14, 30], [10, 30], [33, 30], [3, 30], [40, 30], [41, 14]];
  for (const [x, y] of trees) set(x, y, 'T');
  const bushes: [number, number][] = [[16, 9], [15, 10], [11, 15], [32, 15], [11, 25], [32, 25], [19, 22], [24, 22]];
  for (const [x, y] of bushes) set(x, y, 'b');
  return g.map((row) => row.join(''));
}

const HOSPITAL: BuildingStyle = { roof: '#3d6fb6', wall: '#f1ece0', trim: '#2b5088', icon: 'cross', accent: '#c8373a' };
const ANATOMIA: BuildingStyle = { roof: '#c46a3a', wall: '#efe2c8', trim: '#8a4a28', icon: 'bone', accent: '#d98f4e' };
const BIBLIOTECA: BuildingStyle = { roof: '#6a4a9c', wall: '#ece6da', trim: '#4c3475', icon: 'book', accent: '#6a4a9c' };
const AULAS: BuildingStyle = { roof: '#b8506a', wall: '#eee8d8', trim: '#8a3450', icon: 'heart', accent: '#d65a7a' };
const LABS: BuildingStyle = { roof: '#2a8f99', wall: '#e8eef0', trim: '#1d6970', icon: 'flask', accent: '#2a8f99' };

export const campus: MapDef = {
  id: 'campus',
  name: 'Campus da Universidade de Aurora',
  kind: 'outdoor',
  music: 'campus',
  width: W,
  height: H,
  tiles: build(),
  buildings: [
    {
      id: 'hospital', name: 'Hospital Veterinário Universitário', x: 16, y: 2, w: 12, h: 7, style: HOSPITAL,
      doors: [{ dx: 6, warp: { map: 'hospital', x: 10, y: 13, facing: 'up' }, locked: { message: 'O Hospital Veterinário recebe estudantes após a primeira aula de anatomia. Fale com o Prof. Otávio no Laboratório de Anatomia (oeste).', when: { questNotStarted: 'q_biosseguranca' } } }],
    },
    { id: 'anatomia', name: 'Laboratório de Anatomia', x: 3, y: 10, w: 8, h: 6, style: ANATOMIA, doors: [{ dx: 4, warp: { map: 'anatomia', x: 8, y: 11, facing: 'up' } }] },
    { id: 'biblioteca', name: 'Biblioteca Central', x: 33, y: 10, w: 8, h: 6, style: BIBLIOTECA, doors: [{ dx: 3, warp: { map: 'biblioteca', x: 8, y: 11, facing: 'up' } }] },
    { id: 'aulas', name: 'Instituto de Fisiologia', x: 3, y: 20, w: 8, h: 6, style: AULAS, doors: [{ dx: 4, warp: { map: 'fisiologia', x: 7, y: 10, facing: 'up' } }] },
    { id: 'labs', name: 'Laboratório de Microbiologia', x: 33, y: 20, w: 8, h: 6, style: LABS, doors: [{ dx: 3, warp: { map: 'microbiologia', x: 7, y: 10, facing: 'up' } }] },
  ],
  objects: [
    { type: 'fountain', x: 21, y: 15 },
    { type: 'bench', x: 18, y: 12 },
    { type: 'bench', x: 24, y: 12 },
    { type: 'lamp', x: 20, y: 20 }, { type: 'lamp', x: 23, y: 20 }, { type: 'lamp', x: 20, y: 25 }, { type: 'lamp', x: 23, y: 25 },
    { type: 'flowerbed', x: 17, y: 10 }, { type: 'flowerbed', x: 25, y: 10 },
    { type: 'bench', x: 9, y: 8 },
    { type: 'hay', x: 39, y: 3 }, { type: 'hay', x: 40, y: 4 },
    { type: 'trough', x: 32, y: 7 },
    {
      type: 'big_sign', x: 16, y: 30,
      interact: { lines: ['UNIVERSIDADE VETERINÁRIA DE AURORA', '“Ciência, cuidado e Saúde Única.”'] },
    },
    {
      type: 'sign', x: 24, y: 30,
      interact: { lines: ['Mapa do campus: Hospital ao norte • Anatomia e Fisiologia a oeste • Biblioteca e Microbiologia a leste • Fazenda-escola a nordeste • Setor dos Institutos (Parasitologia, Farmacologia, Patologia, Cirurgia e Saúde Pública) pela avenida oeste.', 'Dica: pressione M para abrir o mapa e J para o diário de missões.'] },
    },
    { type: 'sign', x: 29, y: 10, interact: { lines: ['Fazenda-Escola de Aurora — setor de grandes animais.', 'Observe os animais com calma e sem invadir o piquete.'] } },
    { type: 'gate', x: 20, y: 33 },
    { type: 'gate', x: 22, y: 33 },
    { type: 'sign', x: 2, y: 16, interact: { lines: ['← Setor dos Institutos: Parasitologia, Farmacologia, Patologia, Cirurgia e Anestesiologia, Saúde Pública.'] } },
  ],
  warps: [
    { fromX: 0, fromY: 17, map: 'institutos', x: 38, y: 11, facing: 'left' },
    { fromX: 0, fromY: 18, map: 'institutos', x: 38, y: 12, facing: 'left' },
  ],
  interactions: {
    '20,33': { lines: ['Portão Sul — estrada para a Vila dos Animais.', 'Região bloqueada: disponível na Etapa 2 (Estudante em Formação).'] },
    '21,33': { lines: ['Portão Sul — estrada para a Vila dos Animais.', 'Região bloqueada: disponível na Etapa 2 (Estudante em Formação).'] },
    '22,33': { lines: ['Portão Sul — estrada para a Vila dos Animais.', 'Região bloqueada: disponível na Etapa 2 (Estudante em Formação).'] },
    '23,33': { lines: ['Portão Sul — estrada para a Vila dos Animais.', 'Região bloqueada: disponível na Etapa 2 (Estudante em Formação).'] },
    '43,17': { lines: ['Estrada para a Região Rural.', 'Região bloqueada: disponível na Etapa 3 (Estagiário Clínico).'] },
    '43,18': { lines: ['Estrada para a Região Rural.', 'Região bloqueada: disponível na Etapa 3 (Estagiário Clínico).'] },
  },
  spawn: { x: 21, y: 29, facing: 'up' },
};
