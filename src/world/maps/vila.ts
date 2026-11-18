/**
 * Etapa 2 — Vila dos Animais (ao sul do campus, pelo Portão Sul) e seus interiores:
 * Clínica Veterinária da Vila, Pet Shop Patas & Cia. e Centro de Adoção.
 */
import type { BuildingStyle } from '../../art/objects';
import type { MapDef } from '../mapTypes';
import { rng } from '../../art/pixel';

const W = 40;
const H = 30;

function build(): string[] {
  const g: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const fill = (x: number, y: number, w: number, h: number, c: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  const r = rng(2024);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < 0.06) set(x, y, '"');
  fill(0, 0, W, 2, 'T');
  fill(0, 0, 2, H, 'T');
  fill(W - 2, 0, 2, H, 'T');
  fill(0, H - 2, W, 2, 'T');
  // rua principal (norte–sul, vinda do Portão Sul do campus) e rua transversal
  fill(19, 0, 2, 28, '=');
  fill(2, 14, 36, 2, '=');
  // praça
  fill(4, 2, 10, 4, 'p');
  // acessos às portas
  fill(26, 12, 1, 2, '=');   // clínica
  fill(11, 12, 1, 2, '=');   // pet shop
  fill(10, 24, 1, 1, '=');   // centro de adoção
  fill(10, 25, 10, 1, '=');
  fill(25, 23, 1, 1, '=');   // casas
  fill(34, 23, 1, 1, '=');
  fill(21, 24, 14, 1, '=');
  const trees: [number, number][] = [[3, 9], [16, 8], [35, 3], [36, 10], [3, 26], [16, 21], [36, 26], [30, 26], [2, 17]];
  for (const [x, y] of trees) set(x, y, 'T');
  const bushes: [number, number][] = [[17, 12], [22, 12], [33, 12], [5, 12], [29, 16], [15, 17]];
  for (const [x, y] of bushes) set(x, y, 'b');
  return g.map((row) => row.join(''));
}

const CLINICA: BuildingStyle = { roof: '#2f8a7a', wall: '#f1ece0', trim: '#1f5e54', icon: 'cross', accent: '#2fa08c' };
const PETSHOP: BuildingStyle = { roof: '#e08a3a', wall: '#f4ead8', trim: '#a85e22', icon: 'bone', accent: '#e8a050' };
const ADOCAO: BuildingStyle = { roof: '#c8506a', wall: '#f4e6e0', trim: '#8e3248', icon: 'paw', accent: '#d8607a' };
const CASA_A: BuildingStyle = { roof: '#5a7ac0', wall: '#efe6d6', trim: '#3a5490', icon: 'house', accent: '#6a8ad0' };
const CASA_B: BuildingStyle = { roof: '#8a6a4a', wall: '#ece2d0', trim: '#5e4630', icon: 'house', accent: '#9a7a5a' };

export const vila: MapDef = {
  id: 'vila',
  name: 'Vila dos Animais',
  kind: 'outdoor',
  music: 'campus',
  width: W,
  height: H,
  tiles: build(),
  buildings: [
    { id: 'clinica_vila', name: 'Clínica Veterinária da Vila', x: 23, y: 6, w: 10, h: 6, style: CLINICA, doors: [{ dx: 3, warp: { map: 'clinica_vila', x: 8, y: 11, facing: 'up' } }] },
    { id: 'petshop', name: 'Pet Shop Patas & Cia.', x: 7, y: 7, w: 8, h: 5, style: PETSHOP, doors: [{ dx: 4, warp: { map: 'petshop', x: 7, y: 10, facing: 'up' } }] },
    { id: 'adocao', name: 'Centro de Adoção da Vila', x: 6, y: 18, w: 9, h: 6, style: ADOCAO, doors: [{ dx: 4, warp: { map: 'adocao', x: 7, y: 10, facing: 'up' } }] },
    { id: 'casa_cida', name: 'Casa da Dona Cida', x: 23, y: 18, w: 6, h: 5, style: CASA_A, doors: [{ dx: 2, locked: { message: 'Casa da Dona Cida. Visitas domiciliares ainda não fazem parte da sua vivência — chegam em uma próxima versão.' } }] },
    { id: 'casa_gabriel', name: 'Casa do Gabriel', x: 31, y: 18, w: 6, h: 5, style: CASA_B, doors: [{ dx: 3, locked: { message: 'Casa do Gabriel. Você ouve o Rex latindo lá dentro. Visitas domiciliares chegam em uma próxima versão.' } }] },
  ],
  objects: [
    { type: 'fountain', x: 7, y: 4 },
    { type: 'bench', x: 11, y: 2 },
    { type: 'bench', x: 4, y: 2 },
    { type: 'flowerbed', x: 27, y: 16 },
    { type: 'flowerbed', x: 12, y: 16 },
    { type: 'lamp', x: 18, y: 13 }, { type: 'lamp', x: 21, y: 13 }, { type: 'lamp', x: 18, y: 16 }, { type: 'lamp', x: 21, y: 16 },
    { type: 'sign', x: 21, y: 3, interact: { lines: ['VILA DOS ANIMAIS', 'Clínica Veterinária a leste • Pet Shop e praça a oeste • Centro de Adoção ao sul • Portão da Universidade ao norte.'] } },
    { type: 'sign', x: 27, y: 13, interact: { lines: ['Clínica Veterinária da Vila — Dr. Marcos Vieira.', 'Atendimento de pequenos animais. Estagiários da Universidade de Aurora atendem sob supervisão.'] } },
    { type: 'sign', x: 12, y: 13, interact: { lines: ['Pet Shop Patas & Cia.', '“Antiparasitário certo para cada espécie — pergunte antes de comprar!”'] } },
    { type: 'sign', x: 12, y: 24, interact: { lines: ['Centro de Adoção da Vila.', 'Animais castrados, vacinados e vermifugados à espera de uma família responsável.'] } },
    { type: 'sign', x: 22, y: 26, interact: { lines: ['Estrada para o litoral.', 'Região em desenvolvimento: chega em uma próxima versão.'] } },
  ],
  warps: [
    { fromX: 19, fromY: 0, map: 'campus', x: 21, y: 32, facing: 'up' },
    { fromX: 20, fromY: 0, map: 'campus', x: 22, y: 32, facing: 'up' },
  ],
  interactions: {
    '19,27': { lines: ['A rua termina aqui. Mais adiante, só mato e a estrada de terra para o litoral — ainda em desenvolvimento.'] },
    '20,27': { lines: ['A rua termina aqui. Mais adiante, só mato e a estrada de terra para o litoral — ainda em desenvolvimento.'] },
  },
  spawn: { x: 19, y: 2, facing: 'down' },
};

// ---------------- Interiores ----------------
const row = (w: number, inner: string) => '#' + inner.padEnd(w - 2, '_').slice(0, w - 2) + '#';
const wallRow = (w: number) => '#' + 'W'.repeat(w - 2) + '#';
const exitRow = (w: number, matX: number) => '#'.repeat(matX) + 'mm' + '#'.repeat(w - matX - 2);

// Clínica Veterinária da Vila (18x13)
const CW = 18;
const clinicaTiles = [wallRow(CW), wallRow(CW), ...Array.from({ length: 10 }, () => row(CW, '')), exitRow(CW, 8)];

export const clinica_vila: MapDef = {
  id: 'clinica_vila',
  name: 'Clínica Veterinária da Vila',
  kind: 'indoor',
  music: 'clinic',
  width: CW,
  height: clinicaTiles.length,
  tiles: clinicaTiles,
  floor: 'floor_clinic',
  wallColor: '#dcefe8',
  buildings: [],
  objects: [
    { type: 'poster', x: 3, y: 1, seed: 71, interact: { lines: ['Cartaz: “Carrapato no cão? Controle no animal E no ambiente.”'] } },
    { type: 'poster', x: 6, y: 1, seed: 72, interact: { lines: ['Cartaz: “Antipulgas de cachorro NÃO é para gato. Leia o rótulo!”'] } },
    { type: 'xray', x: 13, y: 1, interact: { lines: ['Negatoscópio da clínica.'] } },
    { type: 'sink', x: 11, y: 2, interact: { lines: ['Pia de higienização das mãos. Antes e depois de cada paciente!'] } },
    { type: 'cabinet', x: 15, y: 2, interact: { lines: ['Armário de materiais: luvas, seringas, gaze e tubos de coleta.'] } },
    { type: 'cabinet', x: 16, y: 2, seed: 7, interact: { lines: ['Armário de medicamentos — acesso restrito ao Dr. Marcos.'] } },
    { type: 'exam_table', x: 12, y: 6, interact: { lines: ['Mesa de atendimento, limpa e desinfetada.'] } },
    { type: 'chairs', x: 1, y: 7 },
    { type: 'chairs', x: 1, y: 10 },
    { type: 'microscope_bench', x: 13, y: 9, interact: { lines: ['Bancada de exames rápidos: hemograma, glicemia, eletrólitos e testes sorológicos.'] } },
    { type: 'fridge', x: 16, y: 6, interact: { lines: ['Refrigerador de vacinas e amostras (2–8 °C).'] } },
    { type: 'plant', x: 1, y: 11 },
    { type: 'plant', x: 16, y: 11 },
  ],
  warps: [
    { fromX: 8, fromY: 12, map: 'vila', x: 26, y: 12, facing: 'down' },
    { fromX: 9, fromY: 12, map: 'vila', x: 26, y: 12, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 8, y: 11, facing: 'up' },
};

// Pet Shop Patas & Cia. (16x12) — balcão na linha 4, com o Seu Hiro atrás
const PW = 16;
const petshopTiles = [
  wallRow(PW), wallRow(PW),
  row(PW, ''), row(PW, ''),
  row(PW, '__cccccccccc'),
  ...Array.from({ length: 6 }, () => row(PW, '')),
  '#'.repeat(7) + 'mm' + '#'.repeat(PW - 9),
];

export const petshop: MapDef = {
  id: 'petshop',
  name: 'Pet Shop Patas & Cia.',
  kind: 'indoor',
  music: 'lab',
  width: PW,
  height: petshopTiles.length,
  tiles: petshopTiles,
  floor: 'floor_wood',
  wallColor: '#f4e2c8',
  buildings: [],
  objects: [
    { type: 'bookshelf', x: 1, y: 2, seed: 81, interact: { lines: ['Prateleira de antiparasitários. Cada embalagem indica a espécie e a faixa de peso.'] } },
    { type: 'bookshelf', x: 13, y: 2, seed: 82, interact: { lines: ['Rações, petiscos e brinquedos. Mudanças de dieta devem ser graduais.'] } },
    { type: 'carrier', x: 2, y: 7, interact: { lines: ['Caixas de transporte: o jeito mais seguro de levar gatos ao veterinário.'] } },
    { type: 'carrier', x: 13, y: 7, interact: { lines: ['Caixa de transporte para cães de pequeno porte.'] } },
    { type: 'hay', x: 3, y: 9, interact: { lines: ['Feno para coelhos e porquinhos-da-índia — fibra é essencial para eles.'] } },
    { type: 'poster', x: 6, y: 1, seed: 83, interact: { lines: ['Cartaz: “Gato não é cachorro pequeno: produtos com permetrina são perigosos para gatos.”'] } },
    { type: 'plant', x: 14, y: 10 },
  ],
  warps: [
    { fromX: 7, fromY: 11, map: 'vila', x: 11, y: 12, facing: 'down' },
    { fromX: 8, fromY: 11, map: 'vila', x: 11, y: 12, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 7, y: 10, facing: 'up' },
};

// Centro de Adoção da Vila (16x12)
const AW = 16;
const adocaoTiles = [wallRow(AW), wallRow(AW), ...Array.from({ length: 9 }, () => row(AW, '')), '#'.repeat(7) + 'mm' + '#'.repeat(AW - 9)];

export const adocao: MapDef = {
  id: 'adocao',
  name: 'Centro de Adoção da Vila',
  kind: 'indoor',
  music: 'lab',
  width: AW,
  height: adocaoTiles.length,
  tiles: adocaoTiles,
  floor: 'floor_wood',
  wallColor: '#f4e0e4',
  buildings: [],
  objects: [
    { type: 'poster', x: 3, y: 1, seed: 91, interact: { lines: ['Cartaz: “Adotar é para a vida toda: tempo, espaço, custos e carinho.”'] } },
    { type: 'poster', x: 12, y: 1, seed: 92, interact: { lines: ['Cartaz: “Todos os animais saem castrados, vacinados, vermifugados e com microchip.”'] } },
    { type: 'carrier', x: 1, y: 3 },
    { type: 'carrier', x: 14, y: 3 },
    { type: 'desk', x: 11, y: 8, interact: { lines: ['Fichas de adoção: entrevista, termo de responsabilidade e acompanhamento pós-adoção.'] } },
    { type: 'plant', x: 1, y: 10 },
    { type: 'plant', x: 14, y: 10 },
  ],
  warps: [
    { fromX: 7, fromY: 11, map: 'vila', x: 10, y: 24, facing: 'down' },
    { fromX: 8, fromY: 11, map: 'vila', x: 10, y: 24, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 7, y: 10, facing: 'up' },
};
