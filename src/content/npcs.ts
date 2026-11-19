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
  { id: 'livia', name: 'Profa. Lívia Campos', role: 'Professora de Fisiologia', look: coat(0, 4, 'coque', 3), map: 'fisiologia', x: 8, y: 3, facing: 'down', dialogue: 'livia' },
  { id: 'antonio', name: 'Seu Antônio', role: 'Produtor rural e técnico da fazenda-escola', look: casual(2, 0, 'curto', '#7a8a4a', '#4a4038', { hat: '#d8b25a' }), map: 'campus', x: 31, y: 10, facing: 'up', dialogue: 'antonio' },
  { id: 'rafa', name: 'Rafaela', role: 'Colega de graduação', look: coat(4, 0, 'longo', 0), map: 'campus', x: 27, y: 22, facing: 'left', wander: 2, dialogue: 'rafa' },
  { id: 'otavio', name: 'Prof. Otávio Ramos', role: 'Professor de Anatomia Veterinária', look: coat(2, 5, 'curto', 2, { glasses: true, beard: true }), map: 'anatomia', x: 8, y: 3, facing: 'down', dialogue: 'otavio' },
  { id: 'helena', name: 'Dra. Helena Duarte', role: 'Médica-veterinária responsável pelo Hospital', look: scrubs(4, 0, 'longo', '#2a8f99'), map: 'hospital', x: 15, y: 6, facing: 'left', dialogue: 'helena' },
  { id: 'carla', name: 'Carla', role: 'Recepcionista do Hospital', look: casual(1, 1, 'longo', '#3f9d76', '#38405a'), map: 'hospital', x: 4, y: 4, facing: 'down', dialogue: 'carla' },
  { id: 'bia', name: 'Bia', role: 'Técnica de laboratório', look: scrubs(1, 3, 'coque', '#6a4a9c'), map: 'hospital', x: 17, y: 12, facing: 'up', dialogue: 'bia' },
  { id: 'joaquim', name: 'Sr. Joaquim', role: 'Tutor do Thor', look: casual(2, 5, 'curto', '#b8553a', '#4a5578', { beard: true }), map: 'hospital', x: 4, y: 9, facing: 'right', dialogue: 'joaquim', visibleWhen: { patientPresent: 'caso_thor_prurido' } },
  { id: 'marta', name: 'Dona Marta', role: 'Tutora da Mimi', look: casual(0, 1, 'coque', '#d47aa0', '#5a4a6a', { glasses: true }), map: 'hospital', x: 4, y: 11, facing: 'right', dialogue: 'marta', visibleWhen: { all: [{ questStarted: 'q_gato_nao_come' }, { patientPresent: 'caso_mimi_hiporexia' }] } },
  { id: 'sofia', name: 'Sofia', role: 'Tutora do Pingo', look: casual(3, 0, 'longo', '#e8c13c', '#3a4258'), map: 'hospital', x: 8, y: 8, facing: 'down', dialogue: 'sofia', visibleWhen: { all: [{ questStarted: 'q_filhote' }, { patientPresent: 'caso_pingo_diarreia' }] } },
  { id: 'paulo', name: 'Sr. Paulo', role: 'Tutor do Nino', look: casual(4, 5, 'curto', '#3d6fb6', '#38405a', { glasses: true }), map: 'hospital', x: 8, y: 11, facing: 'down', dialogue: 'paulo', visibleWhen: { all: [{ questStarted: 'q_emergencia' }, { patientPresent: 'caso_nino_obstrucao' }] } },
  { id: 'julia', name: 'Júlia', role: 'Voluntária do projeto de adoção responsável', look: casual(3, 4, 'cacheado', '#e8843a', '#3a4258'), map: 'campus', x: 26, y: 15, facing: 'left', dialogue: 'julia' },
  { id: 'renata', name: 'Profa. Renata Okabe', role: 'Professora de Microbiologia', look: coat(1, 0, 'chanel', 5, { glasses: true, sex: 'feminino' }), map: 'microbiologia', x: 8, y: 3, facing: 'down', dialogue: 'renata' },
  { id: 'jorge', name: 'Prof. Jorge Bastos', role: 'Professor de Parasitologia', look: coat(3, 1, 'raspado', 4, { beard: true, sex: 'masculino' }), map: 'parasitologia', x: 8, y: 3, facing: 'down', dialogue: 'jorge' },
  { id: 'ines', name: 'Profa. Inês Moura', role: 'Professora de Farmacologia', look: coat(2, 1, 'rabo', 2, { sex: 'feminino' }), map: 'farmacologia', x: 8, y: 3, facing: 'down', dialogue: 'ines' },
  { id: 'raul', name: 'Prof. Raul Siqueira', role: 'Professor de Patologia', look: coat(0, 5, 'curto', 1, { glasses: true, sex: 'masculino' }), map: 'patologia', x: 8, y: 3, facing: 'down', dialogue: 'raul' },
  { id: 'beatriz', name: 'Profa. Beatriz Leal', role: 'Professora de Cirurgia e Anestesiologia', look: scrubs(4, 0, 'trancas', '#3f8a5c', { sex: 'feminino' }), map: 'cirurgia', x: 8, y: 3, facing: 'down', dialogue: 'beatriz' },
  { id: 'tomas', name: 'Prof. Tomás Araújo', role: 'Professor de Saúde Pública Veterinária', look: coat(4, 0, 'curto', 0, { beard: true, sex: 'masculino' }), map: 'saude_publica', x: 8, y: 3, facing: 'down', dialogue: 'tomas' },
  { id: 'nara', name: 'Nara', role: 'Colega de graduação (monitora dos institutos)', look: casual(1, 6, 'rabo', '#3d6fb6', '#3a5a8a', { sex: 'feminino', pattern: 'patinhas', patternColor: '#f4f0e6' }), map: 'institutos', x: 30, y: 13, facing: 'left', wander: 2, dialogue: 'nara' },
  // ---- Etapa 2: Vila dos Animais
  { id: 'marcos', name: 'Dr. Marcos Vieira', role: 'Médico-veterinário da Clínica Veterinária da Vila', look: scrubs(3, 5, 'curto', '#2f8a7a', { glasses: true, beard: true, sex: 'masculino' }), map: 'clinica_vila', x: 10, y: 5, facing: 'down', dialogue: 'marcos' },
  { id: 'cida', name: 'Dona Cida', role: 'Tutora do Bidu', look: casual(2, 5, 'coque', '#c8506a', '#4a4058', { sex: 'feminino', pattern: 'bolinhas', patternColor: '#f4f0e6' }), map: 'clinica_vila', x: 3, y: 7, facing: 'right', dialogue: 'cida', visibleWhen: { all: [{ questStarted: 'q_vila_bidu' }, { patientPresent: 'caso_bidu_erliquiose' }] } },
  { id: 'gabriel', name: 'Gabriel', role: 'Tutor da Luna', look: casual(1, 0, 'cacheado', '#3a3a48', '#3a5a8a', { sex: 'masculino', pattern: 'listras', patternColor: '#e8566a' }), map: 'clinica_vila', x: 3, y: 10, facing: 'right', dialogue: 'gabriel', visibleWhen: { all: [{ questStarted: 'q_vila_luna' }, { patientPresent: 'caso_luna_permetrina' }] } },
  { id: 'hiro', name: 'Seu Hiro', role: 'Dono do Pet Shop Patas & Cia.', look: casual(1, 5, 'raspado', '#e08a3a', '#4a4038', { sex: 'masculino', glasses: true }), map: 'petshop', x: 8, y: 3, facing: 'down', dialogue: 'hiro' },
  { id: 'tania', name: 'Tânia', role: 'Coordenadora do Centro de Adoção da Vila', look: casual(4, 0, 'trancas', '#d8607a', '#3a4258', { sex: 'feminino', pattern: 'patinhas', patternColor: '#f4f0e6' }), map: 'adocao', x: 8, y: 3, facing: 'down', dialogue: 'tania' },
  { id: 'rosa', name: 'Dona Rosa', role: 'Cuidadora de gatos comunitários', look: casual(0, 5, 'chanel', '#8a6bc9', '#4a4058', { sex: 'feminino', glasses: true }), map: 'vila', x: 6, y: 7, facing: 'down', dialogue: 'rosa' },
  { id: 'bruno', name: 'Bruno', role: 'Colega de graduação', look: coat(1, 3, 'curto', 4), map: 'biblioteca', x: 5, y: 7, facing: 'down', dialogue: 'bruno' },
];

export const ANIMALS: AnimalDef[] = [
  {
    id: 'thor', name: 'Thor', sprite: 'dog_caramelo', map: 'hospital', x: 5, y: 9, behavior: 'scratch',
    interact: { dialogue: 'thor_animal' },
    visibleWhen: { patientPresent: 'caso_thor_prurido' },
  },
  {
    id: 'mimi', name: 'Mimi', sprite: 'cat_laranja', map: 'hospital', x: 5, y: 11, behavior: 'idle',
    interact: { dialogue: 'mimi_animal' }, visibleWhen: { all: [{ questStarted: 'q_gato_nao_come' }, { patientPresent: 'caso_mimi_hiporexia' }] },
  },
  {
    id: 'pingo', name: 'Pingo', sprite: 'pup_pingo', map: 'hospital', x: 9, y: 8, behavior: 'idle',
    interact: { dialogue: 'pingo_animal' }, visibleWhen: { all: [{ questStarted: 'q_filhote' }, { patientPresent: 'caso_pingo_diarreia' }] },
  },
  {
    id: 'nino', name: 'Nino', sprite: 'cat_cinza', map: 'hospital', x: 9, y: 11, behavior: 'idle',
    interact: { dialogue: 'nino_animal' }, visibleWhen: { all: [{ questStarted: 'q_emergencia' }, { patientPresent: 'caso_nino_obstrucao' }] },
  },
  {
    id: 'bidu', name: 'Bidu', sprite: 'dog_bidu', map: 'clinica_vila', x: 4, y: 7, behavior: 'idle',
    interact: { lines: ['O Bidu está deitado, quieto e quente. Há carrapatos nas orelhas dele.', 'Converse com a Dona Cida para iniciar o atendimento.'] }, visibleWhen: { all: [{ questStarted: 'q_vila_bidu' }, { patientPresent: 'caso_bidu_erliquiose' }] },
  },
  {
    id: 'luna', name: 'Luna', sprite: 'cat_luna', map: 'clinica_vila', x: 4, y: 10, behavior: 'scratch',
    interact: { lines: ['A Luna treme sem parar e baba muito. O pelo da nuca está oleoso.', 'É urgente: converse com o Gabriel para iniciar o atendimento.'] }, visibleWhen: { all: [{ questStarted: 'q_vila_luna' }, { patientPresent: 'caso_luna_permetrina' }] },
  },
  {
    id: 'biscoito', name: 'Biscoito', sprite: 'dog_campus', map: 'adocao', x: 4, y: 6, behavior: 'idle',
    interact: { lines: ['Biscoito, 3 anos, castrado e vacinado, abana o rabo para você.', 'Ficha: “Dócil, adora passear. Procura família com quintal ou passeios diários.”'] },
  },
  {
    id: 'nuvem', name: 'Nuvem', sprite: 'cat_cinza', map: 'adocao', x: 12, y: 5, behavior: 'idle',
    interact: { lines: ['Nuvem, gata de 1 ano, observa você com calma.', 'Ficha: “Castrada, vacinada e testada. Ideal para apartamento com telas nas janelas.”'] },
  },
  {
    id: 'mingau', name: 'Mingau', sprite: 'cat_laranja', map: 'vila', x: 16, y: 16, behavior: 'wander', wander: 2,
    interact: { lines: ['Mingau, gato comunitário da praça, tem a pontinha da orelha esquerda cortada.', 'É a marca de que ele foi castrado no programa de captura, esterilização e devolução da Dona Rosa.'] },
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
