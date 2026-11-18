/** Personagens originais do VetQuest e animais do mundo. */
import type { AnimalDef, NpcDef } from '../world/mapTypes';
import { HAIR_COLORS, SKIN_TONES, UNIFORM_COLORS, type CharacterLook } from '../art/characters';

const coat = (skin: number, hair: number, style: CharacterLook['hairStyle'], uniform: number, extra: Partial<CharacterLook> = {}): CharacterLook => ({
  skin: SKIN_TONES[skin], hair: HAIR_COLORS[hair], hairStyle: style,
  top: '#f3f3ec', topShade: '#c3c8d6', inner: UNIFORM_COLORS[uniform], pants: '#38405a', shoes: '#3a3038', accent: '#59607a', ...extra,
});
const scrubs = (skin: number, hair: number, style: CharacterLook['hairStyle'], color: string, extra: Partial<CharacterLook> = {}): CharacterLook => ({
  skin: SKIN_TONES[skin], hair: HAIR_COLORS[hair], hairStyle: style,
  top: color, inner: color, pants: color, shoes: '#ecebe4', accent: '#59607a', ...extra,
});
const casual = (skin: number, hair: number, style: CharacterLook['hairStyle'], shirt: string, pants: string, extra: Partial<CharacterLook> = {}): CharacterLook => ({
  skin: SKIN_TONES[skin], hair: HAIR_COLORS[hair], hairStyle: style,
  top: shirt, inner: shirt, pants, shoes: '#4a3a30', accent: null, ...extra,
});

export const NPCS: NpcDef[] = [
  { id: 'lucas', name: 'Lucas', role: 'Colega de graduação', look: coat(3, 0, 'cacheado', 1), map: 'campus', x: 22, y: 24, facing: 'down', wander: 0, dialogue: 'lucas' },
  { id: 'livia', name: 'Profa. Lívia Campos', role: 'Professora de Fisiologia', look: coat(0, 4, 'coque', 3), map: 'campus', x: 12, y: 7, facing: 'down', dialogue: 'livia' },
  { id: 'antonio', name: 'Seu Antônio', role: 'Produtor rural e técnico da fazenda-escola', look: casual(2, 0, 'curto', '#7a8a4a', '#4a4038', { hat: '#d8b25a' }), map: 'campus', x: 31, y: 10, facing: 'up', dialogue: 'antonio' },
  { id: 'rafa', name: 'Rafaela', role: 'Colega de graduação', look: coat(4, 0, 'longo', 0), map: 'campus', x: 27, y: 22, facing: 'left', wander: 2, dialogue: 'rafa' },
  { id: 'otavio', name: 'Prof. Otávio Ramos', role: 'Professor de Anatomia Veterinária', look: coat(2, 5, 'curto', 2, { glasses: true, beard: true }), map: 'anatomia', x: 8, y: 3, facing: 'down', dialogue: 'otavio' },
  { id: 'helena', name: 'Dra. Helena Duarte', role: 'Médica-veterinária responsável pelo Hospital', look: scrubs(4, 0, 'longo', '#2a8f99'), map: 'hospital', x: 15, y: 6, facing: 'left', dialogue: 'helena' },
  { id: 'carla', name: 'Carla', role: 'Recepcionista do Hospital', look: casual(1, 1, 'longo', '#3f9d76', '#38405a'), map: 'hospital', x: 4, y: 4, facing: 'down', dialogue: 'carla' },
  { id: 'bia', name: 'Bia', role: 'Técnica de laboratório', look: scrubs(1, 3, 'coque', '#6a4a9c'), map: 'hospital', x: 17, y: 12, facing: 'up', dialogue: 'bia' },
  { id: 'joaquim', name: 'Sr. Joaquim', role: 'Tutor do Thor', look: casual(2, 5, 'curto', '#b8553a', '#4a5578', { beard: true }), map: 'hospital', x: 4, y: 9, facing: 'right', dialogue: 'joaquim' },
  { id: 'marta', name: 'Dona Marta', role: 'Tutora da Mimi', look: casual(0, 1, 'coque', '#d47aa0', '#5a4a6a', { glasses: true }), map: 'hospital', x: 4, y: 11, facing: 'right', dialogue: 'marta', visibleWhen: { questStarted: 'q_gato_nao_come' } },
  { id: 'julia', name: 'Júlia', role: 'Voluntária do projeto de adoção responsável', look: casual(3, 4, 'cacheado', '#e8843a', '#3a4258'), map: 'campus', x: 26, y: 15, facing: 'left', dialogue: 'julia' },
  { id: 'bruno', name: 'Bruno', role: 'Colega de graduação', look: coat(1, 3, 'curto', 4), map: 'biblioteca', x: 5, y: 7, facing: 'down', dialogue: 'bruno' },
];

export const ANIMALS: AnimalDef[] = [
  {
    id: 'thor', name: 'Thor', sprite: 'dog_caramelo', map: 'hospital', x: 5, y: 9, behavior: 'scratch',
    interact: { dialogue: 'thor_animal' },
  },
  {
    id: 'mimi', name: 'Mimi', sprite: 'cat_laranja', map: 'hospital', x: 5, y: 11, behavior: 'idle',
    interact: { dialogue: 'mimi_animal' }, visibleWhen: { questStarted: 'q_gato_nao_come' },
  },
  {
    id: 'caramelo', name: 'Paçoca', sprite: 'dog_campus', map: 'campus', x: 19, y: 16, behavior: 'wander', wander: 3,
    interact: { lines: ['A Paçoca, cadela comunitária do campus, abana o rabo para você.', 'Ela é castrada, vacinada e acompanhada pelo Hospital — um exemplo de manejo responsável de animais comunitários.'], effects: [{ type: 'dex', ids: ['especie_cao'] }, { type: 'flag', key: 'viu_cao' }] },
  },
  {
    id: 'estrela', name: 'Estrela', sprite: 'cow', map: 'campus', x: 34, y: 5, behavior: 'graze', wander: 3,
    interact: { dialogue: 'vaca' },
  },
  {
    id: 'ovelha1', name: 'Nuvem', sprite: 'sheep', map: 'campus', x: 37, y: 4, behavior: 'graze', wander: 2,
    interact: { dialogue: 'ovelha' },
  },
  {
    id: 'ovelha2', name: 'Algodão', sprite: 'sheep', map: 'campus', x: 38, y: 6, behavior: 'graze', wander: 2, flip: true,
    interact: { dialogue: 'ovelha' },
  },
  {
    id: 'gato_biblioteca', name: 'Tico', sprite: 'cat_cinza', map: 'biblioteca', x: 15, y: 10, behavior: 'idle',
    interact: { lines: ['Tico, o gato da biblioteca, cochila sobre um livro de fisiologia.', 'Gatos passam boa parte do dia dormindo — comportamento normal da espécie.'], effects: [{ type: 'dex', ids: ['especie_gato'] }] },
  },
];
