/** Mapas internos: Hospital Veterinário, Laboratório de Anatomia e Biblioteca. */
import type { MapDef } from '../mapTypes';

const row = (w: number, inner: string) => '#' + inner.padEnd(w - 2, '_').slice(0, w - 2) + '#';
const wallRow = (w: number) => '#' + 'W'.repeat(w - 2) + '#';
const exitRow = (w: number, matX: number) => '#'.repeat(matX) + 'mm' + '#'.repeat(w - matX - 2);

// ---------------- Hospital Veterinário Universitário (22x15) ----------------
const HW = 22;
const hospitalTiles = [
  wallRow(HW),
  wallRow(HW),
  row(HW, ''),
  row(HW, ''),
  row(HW, ''),
  row(HW, '_ccccc'),
  row(HW, ''),
  row(HW, ''),
  row(HW, '_,,,,,,'),
  row(HW, '_,,,,,,'),
  row(HW, '_,,,,,,'),
  row(HW, '_,,,,,,'),
  row(HW, ''),
  row(HW, ''),
  exitRow(HW, 10),
];

export const hospital: MapDef = {
  id: 'hospital',
  name: 'Hospital Veterinário Universitário',
  kind: 'indoor',
  music: 'clinic',
  width: HW,
  height: hospitalTiles.length,
  tiles: hospitalTiles,
  floor: 'floor_clinic',
  wallColor: '#dfe9ee',
  buildings: [],
  objects: [
    { type: 'plant', x: 1, y: 5 },
    { type: 'plant', x: 7, y: 5 },
    { type: 'poster', x: 3, y: 1, interact: { lines: ['Cartaz: “Higienize as mãos antes e depois de cada paciente.”'] } },
    { type: 'poster', x: 8, y: 1, seed: 3, interact: { lines: ['Cartaz: “Vacinação e controle de parasitas salvam vidas — fale com o seu veterinário.”'] } },
    { type: 'chairs', x: 2, y: 9 },
    { type: 'chairs', x: 2, y: 11 },
    { type: 'sink', x: 11, y: 2, interact: { lines: ['Pia de higienização das mãos, com sabonete e papel-toalha.', 'Higienizar as mãos antes e depois de cada paciente é uma das medidas de biossegurança mais eficazes.'] } },
    { type: 'xray', x: 13, y: 1, interact: { lines: ['Negatoscópio. As radiografias serão estudadas em Diagnóstico por Imagem.'] } },
    { type: 'exam_table', x: 13, y: 6, interact: { lines: ['Mesa de atendimento, limpa e desinfetada.'] } },
    { type: 'cabinet', x: 17, y: 2, interact: { lines: ['Armário de materiais: luvas, seringas, gaze, frascos de coleta.'] } },
    { type: 'cabinet', x: 18, y: 2, seed: 7, interact: { lines: ['Armário de medicamentos — acesso restrito à equipe veterinária.'] } },
    { type: 'door_locked', x: 15, y: 1, interact: { lines: ['Internação — acesso apenas com a equipe.', 'O Centro Veterinário Avançado (internação, imagem, centro cirúrgico e UTI) será liberado nas Etapas 4 e 5.'] } },
    { type: 'door_locked', x: 20, y: 1, interact: { lines: ['Centro Cirúrgico — área restrita.', 'Em breve: Cirurgia e Anestesiologia (Etapa 4).'] } },
    { type: 'microscope_bench', x: 15, y: 12, interact: { lines: ['Bancada do laboratório de análises clínicas. A técnica Bia processa os exames solicitados nos atendimentos.'] } },
    { type: 'fridge', x: 18, y: 12, interact: { lines: ['Refrigerador de amostras biológicas (2–8 °C). Nada de alimentos aqui!'] } },
    { type: 'plant', x: 20, y: 13 },
    { type: 'plant', x: 1, y: 13 },
  ],
  warps: [
    { fromX: 10, fromY: 14, map: 'campus', x: 22, y: 9, facing: 'down' },
    { fromX: 11, fromY: 14, map: 'campus', x: 22, y: 9, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 10, y: 13, facing: 'up' },
};

// ---------------- Laboratório de Anatomia (18x13) ----------------
const AW = 18;
const anatomiaTiles = [
  wallRow(AW),
  wallRow(AW),
  ...Array.from({ length: 10 }, () => row(AW, '')),
  exitRow(AW, 8),
];

export const anatomia: MapDef = {
  id: 'anatomia',
  name: 'Laboratório de Anatomia',
  kind: 'indoor',
  music: 'lab',
  width: AW,
  height: anatomiaTiles.length,
  tiles: anatomiaTiles,
  floor: 'floor_lab',
  wallColor: '#efe2c8',
  buildings: [],
  objects: [
    { type: 'whiteboard', x: 7, y: 1, interact: { lines: ['Quadro: “Esqueleto axial: crânio, coluna vertebral, costelas e esterno. Esqueleto apendicular: membros.”'] } },
    { type: 'poster', x: 3, y: 1, seed: 11, interact: { lines: ['Pôster: fórmulas vertebrais — Cão: C7 T13 L7 S3 Cd20–23.'] } },
    { type: 'poster', x: 12, y: 1, seed: 12, interact: { lines: ['Pôster: estômago dos ruminantes — rúmen, retículo, omaso e abomaso.'] } },
    { type: 'poster', x: 14, y: 1, seed: 13, interact: { lines: ['Pôster: “Respeito às peças anatômicas — elas vieram de animais que contribuem para o seu aprendizado.”'] } },
    { type: 'skeleton', x: 2, y: 4, interact: { lines: ['Esqueleto montado de cão (Canis lupus familiaris).', 'Repare: o membro torácico não tem articulação óssea com o tronco — a união é muscular (sinsarcose).'] } },
    { type: 'skeleton', x: 13, y: 4, seed: 5, interact: { lines: ['Esqueleto de cão de porte médio. Conte as costelas: 13 pares.'] } },
    { type: 'skull', x: 6, y: 4, interact: { lines: ['Crânio bovino. Note a ausência de incisivos superiores: no lugar há o pulvino dentário.'] } },
    { type: 'skull', x: 11, y: 4, seed: 9, interact: { lines: ['Crânio bovino com processos cornuais.'] } },
    { type: 'exam_table', x: 3, y: 8, interact: { lines: ['Mesa de estudo de peças anatômicas. Use luvas e jaleco!'] } },
    { type: 'exam_table', x: 12, y: 8, interact: { lines: ['Mesa de estudo com ossos do membro pélvico: fêmur, patela, tíbia e fíbula.'] } },
    { type: 'cabinet', x: 1, y: 2, seed: 2, interact: { lines: ['Armário com modelos anatômicos e frascos de peças fixadas.'] } },
    { type: 'cabinet', x: 16, y: 2, seed: 4, interact: { lines: ['Armário com atlas e luvas de procedimento.'] } },
    { type: 'sink', x: 15, y: 2, interact: { lines: ['Pia para higienização das mãos após manipular peças.'] } },
    { type: 'plant', x: 1, y: 11 },
    { type: 'plant', x: 16, y: 11 },
  ],
  warps: [
    { fromX: 8, fromY: 12, map: 'campus', x: 7, y: 16, facing: 'down' },
    { fromX: 9, fromY: 12, map: 'campus', x: 7, y: 16, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 8, y: 11, facing: 'up' },
};

// ---------------- Biblioteca Central (18x13) ----------------
const BW = 18;
const bibliotecaTiles = [
  wallRow(BW),
  wallRow(BW),
  row(BW, ''),
  row(BW, ''),
  row(BW, ''),
  row(BW, ''),
  row(BW, ''),
  row(BW, '_____,,,,,,'),
  row(BW, '_____,,,,,,'),
  row(BW, '_____,,,,,,'),
  row(BW, ''),
  row(BW, ''),
  exitRow(BW, 8),
];

export const biblioteca: MapDef = {
  id: 'biblioteca',
  name: 'Biblioteca Central',
  kind: 'indoor',
  music: 'lab',
  width: BW,
  height: bibliotecaTiles.length,
  tiles: bibliotecaTiles,
  floor: 'floor_wood',
  wallColor: '#e6dcc8',
  buildings: [],
  objects: [
    { type: 'bookshelf', x: 1, y: 2, seed: 21, interact: { dialogue: 'livro_vacinacao' } },
    { type: 'bookshelf', x: 3, y: 2, seed: 22, interact: { dialogue: 'livro_saude_unica' } },
    { type: 'bookshelf', x: 5, y: 2, seed: 23, interact: { dialogue: 'livro_biosseguranca' } },
    { type: 'bookshelf', x: 11, y: 2, seed: 24, interact: { lines: ['Seção de Anatomia: “Tratado de Anatomia Veterinária” e atlas de osteologia.'] } },
    { type: 'bookshelf', x: 13, y: 2, seed: 25, interact: { lines: ['Seção de Clínica Médica: livros de medicina interna de pequenos animais.'] } },
    { type: 'bookshelf', x: 15, y: 2, seed: 26, interact: { lines: ['Seção de Fisiologia: “Tratado de Fisiologia Veterinária”.'] } },
    { type: 'desk', x: 8, y: 3, interact: { lines: ['Computador do acervo: consulte seu painel de desempenho acadêmico.'], effects: [{ type: 'openPanel', panel: 'performance' }] } },
    { type: 'terminal', x: 14, y: 6, interact: { lines: ['Estação de Revisão Espaçada: perguntas sobre conteúdos em que você teve dificuldade.'], effects: [{ type: 'openReview' }] } },
    { type: 'study_table', x: 2, y: 8 },
    { type: 'study_table', x: 12, y: 9 },
    { type: 'plant', x: 1, y: 11 },
    { type: 'plant', x: 16, y: 11 },
  ],
  warps: [
    { fromX: 8, fromY: 12, map: 'campus', x: 36, y: 16, facing: 'down' },
    { fromX: 9, fromY: 12, map: 'campus', x: 36, y: 16, facing: 'down' },
  ],
  interactions: {},
  spawn: { x: 8, y: 11, facing: 'up' },
};
