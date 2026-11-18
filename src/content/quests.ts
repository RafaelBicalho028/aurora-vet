/** Missões (diário). Objetivos são concluídos por efeitos de diálogo, atendimentos e eventos do mundo. */
export interface QuestDef {
  id: string;
  title: string;
  category: 'principal' | 'secundaria';
  giver: string;
  stage: number;
  summary: string;
  objectives: { id: string; text: string }[];
  rewards: { xp: number; items?: string[]; dex?: string[]; flags?: string[] };
  /** missões iniciadas automaticamente ao concluir esta */
  next?: string[];
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q_boas_vindas', title: 'Boas-vindas a Aurora', category: 'principal', giver: 'Lucas', stage: 1,
    summary: 'Primeiro dia na Universidade Veterinária de Aurora! Conheça o campus e apresente-se ao professor de Anatomia.',
    objectives: [
      { id: 'o_lucas', text: 'Converse com Lucas na avenida central' },
      { id: 'o_lab', text: 'Entre no Laboratório de Anatomia (oeste)' },
      { id: 'o_otavio', text: 'Apresente-se ao Prof. Otávio' },
    ],
    rewards: { xp: 30 },
    next: ['q_aula_anatomia'],
  },
  {
    id: 'q_aula_anatomia', title: 'Aula 1: Osteologia e Anatomia Comparada', category: 'principal', giver: 'Prof. Otávio', stage: 1,
    summary: 'Identifique ossos do esqueleto do cão e compare estruturas entre espécies. Nota mínima: 60.',
    objectives: [{ id: 'o_aula', text: 'Conclua a atividade de anatomia com nota ≥ 60' }],
    rewards: { xp: 40, items: ['atlas'] },
    next: ['q_biosseguranca'],
  },
  {
    id: 'q_biosseguranca', title: 'Biossegurança no Hospital', category: 'principal', giver: 'Prof. Otávio', stage: 1,
    summary: 'O Prof. Otávio recomendou você para a vivência supervisionada no Hospital Veterinário Universitário.',
    objectives: [
      { id: 'o_hospital', text: 'Vá ao Hospital Veterinário (norte do campus)' },
      { id: 'o_helena', text: 'Mostre à Dra. Helena que você conhece as regras de biossegurança' },
    ],
    rewards: { xp: 50, items: ['estetoscopio', 'termometro', 'luvas'], dex: ['prev_biosseguranca'] },
    next: ['q_primeiro_paciente'],
  },
  {
    id: 'q_primeiro_paciente', title: 'O Primeiro Paciente', category: 'principal', giver: 'Dra. Helena', stage: 1,
    summary: 'Thor, um cão SRD de 4 anos, chegou com prurido intenso. Conduza o atendimento sob supervisão.',
    objectives: [
      { id: 'o_atender', text: 'Atenda o Thor (fale com o Sr. Joaquim) — nota ≥ 60' },
      { id: 'o_relatar', text: 'Discuta o caso com a Dra. Helena' },
    ],
    rewards: { xp: 60 },
    next: ['q_gato_nao_come'],
  },
  {
    id: 'q_gato_nao_come', title: 'O Gato que Não Come', category: 'principal', giver: 'Dra. Helena', stage: 1,
    summary: 'Mimi, uma gata de 7 anos, está sem comer há dias. Reconheça os sinais de alerta e avalie a urgência.',
    objectives: [
      { id: 'o_atender', text: 'Atenda a Mimi (fale com a Dona Marta) — nota ≥ 60' },
      { id: 'o_relatar', text: 'Discuta o caso com a Dra. Helena' },
    ],
    rewards: { xp: 80 },
    next: ['q_filhote'],
  },
  {
    id: 'q_filhote', title: 'O Filhote Barrigudo', category: 'principal', giver: 'Dra. Helena', stage: 1,
    summary: 'Pingo, um filhote de 3 meses recém-adotado, está com diarreia e barriga inchada. Investigue causas parasitárias e infecciosas — e pense na família.',
    objectives: [
      { id: 'o_atender', text: 'Atenda o Pingo (fale com a Sofia) — nota ≥ 60' },
      { id: 'o_relatar', text: 'Discuta o caso com a Dra. Helena' },
    ],
    rewards: { xp: 80 },
    next: ['q_emergencia'],
  },
  {
    id: 'q_emergencia', title: 'Emergência Veterinária', category: 'principal', giver: 'Dra. Helena', stage: 1,
    summary: 'Um gato chega em estado crítico. Reconheça as prioridades de triagem e estabilização, sob supervisão — e lembre-se: o tempo conta.',
    objectives: [
      { id: 'o_atender', text: 'Atenda o Nino (fale com o Sr. Paulo) — nota ≥ 60' },
      { id: 'o_relatar', text: 'Discuta o caso com a Dra. Helena' },
    ],
    rewards: { xp: 120, flags: ['etapa1_casos_ok'] },
    next: ['q_proxima_etapa'],
  },
  {
    id: 'q_proxima_etapa', title: 'Rumo à Etapa 2', category: 'principal', giver: 'Dra. Helena', stage: 1,
    summary: 'Consolide o que aprendeu: revise conteúdos, refaça casos e explore o campus. A Etapa 2 (Estudante em Formação) abrirá a Vila dos Animais e os laboratórios.',
    objectives: [
      { id: 'o_revisao', text: 'Responda 3 perguntas na Estação de Revisão (Biblioteca)' },
      { id: 'o_nivel', text: 'Alcance o nível 5' },
    ],
    rewards: { xp: 100, flags: ['etapa2_preparado'] },
  },
  {
    id: 'q_sinais_vitais', title: 'Sinais Vitais', category: 'secundaria', giver: 'Profa. Lívia', stage: 1,
    summary: 'A Profa. Lívia quer saber se você conhece os parâmetros vitais básicos.',
    objectives: [{ id: 'o_quiz', text: 'Responda às perguntas da Profa. Lívia' }],
    rewards: { xp: 40, items: ['guia_bolso'], dex: ['fisio_parametros_vitais', 'fisio_tpc_hidratacao'] },
  },
  {
    id: 'q_fazenda', title: 'Conhecendo a Fazenda-Escola', category: 'secundaria', giver: 'Seu Antônio', stage: 1,
    summary: 'Observe os animais de produção da fazenda-escola e aprenda sobre ruminantes.',
    objectives: [
      { id: 'o_vaca', text: 'Observe a vaca Estrela' },
      { id: 'o_ovelha', text: 'Observe as ovelhas' },
    ],
    rewards: { xp: 30, dex: ['especie_bovino', 'especie_ovino'] },
  },
  {
    id: 'q_biblioteca', title: 'Leitura Recomendada', category: 'secundaria', giver: 'Bruno', stage: 1,
    summary: 'Bruno recomendou três estantes da biblioteca com textos introdutórios essenciais.',
    objectives: [
      { id: 'o_vacinacao', text: 'Leia sobre vacinação' },
      { id: 'o_saude_unica', text: 'Leia sobre Saúde Única' },
      { id: 'o_biosseg', text: 'Leia sobre biossegurança' },
    ],
    rewards: { xp: 30, dex: ['prev_vacinacao', 'prev_saude_unica'] },
  },
];

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export interface ItemDef { id: string; name: string; description: string; icon: string }

export const ITEMS: Record<string, ItemDef> = {
  cracha: { id: 'cracha', name: 'Crachá de estudante', description: 'Identificação da Universidade Veterinária de Aurora. Permite acesso às áreas liberadas para sua etapa.', icon: '🪪' },
  caderno: { id: 'caderno', name: 'Caderno de anotações', description: 'Presente do Lucas. Anotar dúvidas e revisar erros é parte do aprendizado.', icon: '📓' },
  atlas: { id: 'atlas', name: 'Atlas de osteologia', description: 'Atlas didático do esqueleto dos animais domésticos. Consulte o VetiDex para rever as estruturas.', icon: '📘' },
  estetoscopio: { id: 'estetoscopio', name: 'Estetoscópio', description: 'Para auscultação cardíaca, pulmonar e abdominal. Uso em atendimentos supervisionados.', icon: '🩺' },
  termometro: { id: 'termometro', name: 'Termômetro clínico digital', description: 'Aferição da temperatura retal. Higienize após cada uso.', icon: '🌡' },
  luvas: { id: 'luvas', name: 'Luvas de procedimento', description: 'EPI para examinar lesões de causa desconhecida e manipular materiais biológicos.', icon: '🧤' },
  guia_bolso: { id: 'guia_bolso', name: 'Guia de bolso: parâmetros vitais', description: 'Faixas de referência aproximadas de FC, FR e temperatura (cão, gato, bovino). Valores variam entre referências.', icon: '📋' },
};
