/**
 * Setor dos Institutos (a oeste do campus) e as salas de aula de cada disciplina.
 * Cada prédio tem um professor com aula de quadros clínicos e questionário.
 */
import type { BuildingStyle } from '../../art/objects';
import type { MapDef, ObjectPlacement } from '../mapTypes';
import { rng } from '../../art/pixel';

const W = 40;
const H = 24;

function build(): string[] {
  const g: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
  const set = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const fill = (x: number, y: number, w: number, h: number, c: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  const r = rng(77);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < 0.05) set(x, y, '"');
  fill(0, 0, W, 2, 'T');
  fill(0, 0, 2, H, 'T');
  fill(W - 2, 0, 2, H, 'T');
  fill(0, H - 2, W, 2, 'T');
  // avenida leste-oeste (liga o campus, a leste, à Reserva, a oeste)
  fill(0, 11, W, 2, '=');
  set(0, 11, 'P'); set(0, 12, 'P');
  // acessos às portas dos prédios do norte
  for (const x of [8, 20, 32]) fill(x, 9, 1, 2, '=');
  // calçada dos prédios do sul e ligações com a avenida
  fill(3, 20, 34, 1, '=');
  fill(3, 13, 1, 7, '=');
  fill(36, 13, 1, 7, '=');
  fill(19, 13, 2, 7, '=');
  const trees: [number, number][] = [[13, 4], [14, 7], [25, 4], [26, 7], [36, 4], [2, 5], [37, 15], [5, 21], [33, 21]];
  for (const [x, y] of trees) set(x, y, 'T');
  const bushes: [number, number][] = [[4, 16], [17, 16], [22, 15], [34, 16], [12, 9], [24, 9]];
  for (const [x, y] of bushes) set(x, y, 'b');
  return g.map((row) => row.join(''));
}

const style = (roof: string, trim: string, icon: BuildingStyle['icon'], accent: string): BuildingStyle => ({ roof, wall: '#eee8d8', trim, icon, accent });

export const institutos: MapDef = {
  id: 'institutos',
  name: 'Setor dos Institutos',
  kind: 'outdoor',
  music: 'campus',
  width: W,
  height: H,
  tiles: build(),
  buildings: [
    { id: 'inst_parasitologia', name: 'Instituto de Parasitologia', x: 4, y: 3, w: 8, h: 6, style: style('#7a5aa8', '#523a7a', 'bug', '#8a6bc9'), doors: [{ dx: 4, warp: { map: 'parasitologia', x: 7, y: 10, facing: 'up' } }] },
    { id: 'inst_farmacologia', name: 'Instituto de Farmacologia', x: 16, y: 3, w: 8, h: 6, style: style('#c4507e', '#8a3458', 'pill', '#e06a9a'), doors: [{ dx: 4, warp: { map: 'farmacologia', x: 7, y: 10, facing: 'up' } }] },
    { id: 'inst_patologia', name: 'Instituto de Patologia', x: 28, y: 3, w: 8, h: 6, style: style('#8a4a3a', '#5e3226', 'microscope', '#9a5a4a'), doors: [{ dx: 4, warp: { map: 'patologia', x: 7, y: 10, facing: 'up' } }] },
    { id: 'inst_cirurgia', name: 'Instituto de Cirurgia e Anestesiologia', x: 6, y: 14, w: 10, h: 6, style: style('#3f8a5c', '#2c6a44', 'scalpel', '#5a9e5a'), doors: [{ dx: 5, warp: { map: 'cirurgia', x: 7, y: 10, facing: 'up' } }] },
    { id: 'inst_saude_publica', name: 'Instituto de Saúde Pública', x: 23, y: 14, w: 10, h: 6, style: style('#b08a2a', '#7a5e1a', 'globe', '#c9a23a'), doors: [{ dx: 5, warp: { map: 'saude_publica', x: 7, y: 10, facing: 'up' } }] },
  ],
  objects: [
    { type: 'lamp', x: 6, y: 10 }, { type: 'lamp', x: 15, y: 10 }, { type: 'lamp', x: 27, y: 10 }, { type: 'lamp', x: 35, y: 10 },
    { type: 'sign', x: 9, y: 10, interact: { lines: ['Instituto de Parasitologia — Prof. Jorge Bastos.', 'Ciclos biológicos, vetores e diagnóstico parasitológico.'] } },
    { type: 'sign', x: 21, y: 10, interact: { lines: ['Instituto de Farmacologia — Profa. Inês Moura.', 'Como os fármacos agem e por que nenhum remédio é inofensivo.'] } },
    { type: 'sign', x: 33, y: 10, interact: { lines: ['Instituto de Patologia — Prof. Raul Siqueira.', 'Lesões, necrópsia e histopatologia.'] } },
    { type: 'sign', x: 12, y: 21, interact: { lines: ['Instituto de Cirurgia e Anestesiologia — Profa. Beatriz Leal.', 'Avaliação pré-anestésica, monitorização e assepsia.'] } },
    { type: 'sign', x: 29, y: 21, interact: { lines: ['Instituto de Saúde Pública — Prof. Tomás Araújo.', 'Zoonoses, inspeção de alimentos e Saúde Única.'] } },
    { type: 'sign', x: 37, y: 10, interact: { lines: ['Setor dos Institutos da Universidade de Aurora.', 'Cada prédio tem um professor com aula de quadros clínicos e questionário. Leste: volta ao campus central.'] } },
    { type: 'bench', x: 23, y: 21 },
    { type: 'flowerbed', x: 17, y: 21 },
  ],
  warps: [
    { fromX: 39, fromY: 11, map: 'campus', x: 1, y: 17, facing: 'right' },
    { fromX: 39, fromY: 12, map: 'campus', x: 1, y: 18, facing: 'right' },
  ],
  interactions: {
    '0,11': { lines: ['Trilha para a Reserva Ambiental.', 'Região bloqueada: disponível na Etapa 4.'] },
    '0,12': { lines: ['Trilha para a Reserva Ambiental.', 'Região bloqueada: disponível na Etapa 4.'] },
  },
  spawn: { x: 37, y: 12, facing: 'left' },
};

// ---------------- Salas de aula (16x12), uma por disciplina ----------------
const CW = 16;
const classroomTiles = [
  '#' + 'W'.repeat(CW - 2) + '#',
  '#' + 'W'.repeat(CW - 2) + '#',
  ...Array.from({ length: 9 }, () => '#' + '_'.repeat(CW - 2) + '#'),
  '#'.repeat(7) + 'mm' + '#'.repeat(CW - 9),
];

interface ClassroomOpts {
  id: string;
  name: string;
  lesson: string;
  board: string;
  back: { map: string; x: number; y: number };
  floor: 'floor_lab' | 'floor_clinic' | 'floor_wood';
  wallColor: string;
  decor: ObjectPlacement[];
}

function classroom(o: ClassroomOpts): MapDef {
  return {
    id: o.id,
    name: o.name,
    kind: 'indoor',
    music: 'lab',
    width: CW,
    height: classroomTiles.length,
    tiles: classroomTiles,
    floor: o.floor,
    wallColor: o.wallColor,
    buildings: [],
    objects: [
      { type: 'whiteboard', x: 7, y: 1, interact: { lines: [o.board, 'O quadro resume a aula. Converse com o professor para ver os quadros clínicos completos.'], effects: [{ type: 'openLesson', id: o.lesson }] } },
      { type: 'study_table', x: 2, y: 7 },
      { type: 'study_table', x: 11, y: 7 },
      { type: 'plant', x: 1, y: 10 },
      { type: 'plant', x: 14, y: 10 },
      ...o.decor,
    ],
    warps: [
      { fromX: 7, fromY: 11, map: o.back.map, x: o.back.x, y: o.back.y, facing: 'down' },
      { fromX: 8, fromY: 11, map: o.back.map, x: o.back.x, y: o.back.y, facing: 'down' },
    ],
    interactions: {},
    spawn: { x: 7, y: 10, facing: 'up' },
  };
}

export const fisiologia = classroom({
  id: 'fisiologia', name: 'Instituto de Fisiologia', lesson: 'aula_fisiologia', floor: 'floor_wood', wallColor: '#f0dde2',
  board: 'Quadro: “Choque, termorregulação e limiar renal — o corpo sempre tenta compensar.”',
  back: { map: 'campus', x: 7, y: 26 },
  decor: [
    { type: 'poster', x: 3, y: 1, seed: 31, interact: { lines: ['Pôster: ciclo cardíaco — sístole e diástole, com as bulhas cardíacas.'] } },
    { type: 'poster', x: 12, y: 1, seed: 32, interact: { lines: ['Pôster: o néfron — filtração no glomérulo, reabsorção nos túbulos.'] } },
    { type: 'cabinet', x: 1, y: 2, seed: 6, interact: { lines: ['Armário com estetoscópios, termômetros e esfigmomanômetros para as aulas práticas.'] } },
    { type: 'terminal', x: 14, y: 3, interact: { lines: ['Simulador de parâmetros vitais. Em breve: práticas de eletrocardiograma.'] } },
  ],
});

export const microbiologia = classroom({
  id: 'microbiologia', name: 'Laboratório de Microbiologia', lesson: 'aula_microbiologia', floor: 'floor_lab', wallColor: '#dceef0',
  board: 'Quadro: “Gram+, roxo; Gram−, rosa. Limpar antes de desinfetar. Esterilizar o que é crítico.”',
  back: { map: 'campus', x: 36, y: 26 },
  decor: [
    { type: 'microscope_bench', x: 2, y: 3, interact: { lines: ['Microscópios com lâminas coradas pelo método de Gram: cocos roxos em cachos e bastonetes rosados.'] } },
    { type: 'microscope_bench', x: 11, y: 4, interact: { lines: ['Placas de cultura com discos de antibiograma. Os halos sem crescimento indicam sensibilidade in vitro.'] } },
    { type: 'sink', x: 1, y: 3, interact: { lines: ['Pia exclusiva para higienização das mãos.'] } },
    { type: 'fridge', x: 14, y: 2, interact: { lines: ['Refrigerador de meios de cultura e amostras (2–8 °C). Proibido guardar alimentos.'] } },
  ],
});

export const parasitologia = classroom({
  id: 'parasitologia', name: 'Instituto de Parasitologia', lesson: 'aula_parasitologia', floor: 'floor_lab', wallColor: '#e6def0',
  board: 'Quadro: “Conheça o ciclo, quebre o ciclo. FAMACHA só para hematófagos.”',
  back: { map: 'institutos', x: 8, y: 9 },
  decor: [
    { type: 'microscope_bench', x: 2, y: 3, interact: { lines: ['Lâminas de fezes por flutuação: ovos de nematódeos e cistos de protozoários.'] } },
    { type: 'poster', x: 3, y: 1, seed: 41, interact: { lines: ['Pôster: ciclo da pulga — ovo, larva, pupa e adulto. A maior parte da população está no ambiente!'] } },
    { type: 'poster', x: 12, y: 1, seed: 42, interact: { lines: ['Pôster: o cartão FAMACHA, com 5 tons de conjuntiva, do vermelho-vivo ao branco.'] } },
    { type: 'cabinet', x: 14, y: 2, seed: 8, interact: { lines: ['Coleção didática de ectoparasitas: pulgas, piolhos e carrapatos fixados em álcool.'] } },
  ],
});

export const farmacologia = classroom({
  id: 'farmacologia', name: 'Instituto de Farmacologia', lesson: 'aula_farmacologia', floor: 'floor_clinic', wallColor: '#f0dde6',
  board: 'Quadro: “Gato não é cão pequeno. Mecanismo, indicação, risco — dose é com o médico-veterinário.”',
  back: { map: 'institutos', x: 20, y: 9 },
  decor: [
    { type: 'cabinet', x: 13, y: 2, seed: 7, interact: { lines: ['Armário didático com embalagens vazias de medicamentos veterinários, organizadas por classe farmacológica.'] } },
    { type: 'cabinet', x: 14, y: 2, seed: 9, interact: { lines: ['Atenção: medicamentos de uso humano podem ser tóxicos para animais.'] } },
    { type: 'desk', x: 2, y: 3, interact: { lines: ['Bulário veterinário: consulte sempre as informações do fabricante e a prescrição do médico-veterinário.'] } },
    { type: 'poster', x: 3, y: 1, seed: 51, interact: { lines: ['Pôster: curva de concentração plasmática × tempo — pico, meia-vida e CIM.'] } },
  ],
});

export const patologia = classroom({
  id: 'patologia', name: 'Instituto de Patologia', lesson: 'aula_patologia', floor: 'floor_lab', wallColor: '#ece0da',
  board: 'Quadro: “Rubor, calor, tumor, dor e perda de função. Suspeita de antraz: NÃO abrir a carcaça.”',
  back: { map: 'institutos', x: 32, y: 9 },
  decor: [
    { type: 'microscope_bench', x: 2, y: 3, interact: { lines: ['Lâminas de histopatologia coradas por hematoxilina e eosina: inflamação aguda com muitos neutrófilos.'] } },
    { type: 'exam_table', x: 11, y: 4, interact: { lines: ['Mesa de necrópsia didática, limpa e desinfetada. EPI completo é obrigatório nas práticas.'] } },
    { type: 'sink', x: 1, y: 3, interact: { lines: ['Pia para higienização após as práticas.'] } },
    { type: 'fridge', x: 14, y: 2, interact: { lines: ['Frascos de formol a 10% para fixação de fragmentos. Manipular com luvas e boa ventilação.'] } },
  ],
});

export const cirurgia = classroom({
  id: 'cirurgia', name: 'Instituto de Cirurgia e Anestesiologia', lesson: 'aula_cirurgia', floor: 'floor_clinic', wallColor: '#dceee2',
  board: 'Quadro: “ASA antes, monitorização durante, assepsia sempre.”',
  back: { map: 'institutos', x: 11, y: 20 },
  decor: [
    { type: 'exam_table', x: 11, y: 4, interact: { lines: ['Mesa cirúrgica de treinamento com manequim para prática de paramentação e suturas.'] } },
    { type: 'sink', x: 1, y: 3, interact: { lines: ['Lavabo cirúrgico: degermação das mãos e antebraços antes da paramentação.'] } },
    { type: 'cabinet', x: 14, y: 2, seed: 5, interact: { lines: ['Caixas de instrumentais embaladas e esterilizadas, com indicador de esterilização.'] } },
    { type: 'terminal', x: 3, y: 3, interact: { lines: ['Monitor multiparamétrico didático: ECG, SpO2, ETCO2, pressão arterial e temperatura.'] } },
  ],
});

export const saude_publica = classroom({
  id: 'saude_publica', name: 'Instituto de Saúde Pública', lesson: 'aula_saude_publica', floor: 'floor_wood', wallColor: '#f0e8d0',
  board: 'Quadro: “Saúde Única: animais, pessoas e ambiente. Notificar também é cuidar.”',
  back: { map: 'institutos', x: 28, y: 20 },
  decor: [
    { type: 'desk', x: 2, y: 3, interact: { lines: ['Mapa de casos de leptospirose após as chuvas: a vigilância cruza dados de saúde humana e animal.'] } },
    { type: 'bookshelf', x: 11, y: 2, seed: 27, interact: { lines: ['Estante com o Guia de Vigilância em Saúde, o RIISPOA e manuais do PNCEBT.'] } },
    { type: 'poster', x: 3, y: 1, seed: 61, interact: { lines: ['Cartaz: “Mordeu? Lave com água e sabão e procure a unidade de saúde.”'] } },
    { type: 'poster', x: 13, y: 1, seed: 62, interact: { lines: ['Cartaz: carimbos de inspeção SIF, SIE e SIM — procure-os nos produtos de origem animal.'] } },
  ],
});
