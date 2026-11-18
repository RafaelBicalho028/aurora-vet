/**
 * Quizzes conduzidos por personagens. As perguntas vêm do banco (questionBank.json) e são sorteadas
 * a cada tentativa. O jogador precisa acertar `required` perguntas em até `maxQuestions`.
 */
import type { Effect } from '../systems/dialogue/types';

export interface QuizDef {
  id: string;
  title: string;
  npc: string;
  pool: string;
  required: number;
  maxQuestions: number;
  intro: string;
  successText: string;
  failText: string;
  onComplete: Effect[];
}

export const QUIZZES: Record<string, QuizDef> = {
  quiz_biosseguranca: {
    id: 'quiz_biosseguranca',
    title: 'Biossegurança no Hospital',
    npc: 'helena',
    pool: 'biosseguranca',
    required: 3,
    maxQuestions: 6,
    intro: 'Acerte 3 perguntas sobre biossegurança. Se errar, explico o motivo e faço outra pergunta.',
    successText: 'Excelente, {nome}! Você está pronto(a) para a vivência. Já temos um paciente: o Thor, do Sr. Joaquim, na sala de espera à esquerda. Converse com o tutor para iniciar o atendimento.',
    failText: 'Ainda não, {nome}. Revise as explicações (o VetiDex e a biblioteca ajudam) e fale comigo de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'microbiologia', skill: 'biosseguranca', xp: 30 },
      { type: 'objective', quest: 'q_biosseguranca', objective: 'o_helena' },
    ],
  },
  quiz_sinais_vitais: {
    id: 'quiz_sinais_vitais',
    title: 'Sinais Vitais',
    npc: 'livia',
    pool: 'sinais_vitais',
    required: 3,
    maxQuestions: 6,
    intro: 'Três acertos sobre sinais vitais e fisiologia básica e o guia de bolso é seu!',
    successText: 'Excelente, {nome}! Leve este guia de bolso. Lembre-se: as faixas variam entre livros — o contexto clínico é o que importa.',
    failText: 'Quase! Revise as explicações e volte a falar comigo: farei perguntas diferentes.',
    onComplete: [
      { type: 'mastery', discipline: 'fisiologia', skill: 'homeostase', xp: 25 },
      { type: 'mastery', discipline: 'fisiologia', skill: 'cardiaca', xp: 20 },
      { type: 'objective', quest: 'q_sinais_vitais', objective: 'o_quiz' },
    ],
  },
  quiz_microbiologia: {
    id: 'quiz_microbiologia',
    title: 'Questionário de Microbiologia',
    npc: 'renata',
    pool: 'microbiologia',
    required: 4,
    maxQuestions: 6,
    intro: 'Acerte 4 de até 6 perguntas de Microbiologia. A cada erro eu explico o motivo — e as perguntas mudam a cada tentativa.',
    successText: 'Muito bem, {nome}! Você foi aprovado(a) no questionário de Microbiologia.',
    failText: 'Ainda não foi desta vez, {nome}. Reveja os quadros clínicos da aula e tente de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'microbiologia', skill: 'bacteriologia', xp: 20 },
      { type: 'mastery', discipline: 'microbiologia', skill: 'metodos_lab', xp: 15 },
      { type: 'objective', quest: 'q_disc_microbiologia', objective: 'o_quiz' },
    ],
  },
  quiz_parasitologia: {
    id: 'quiz_parasitologia',
    title: 'Questionário de Parasitologia',
    npc: 'jorge',
    pool: 'parasitologia',
    required: 4,
    maxQuestions: 6,
    intro: 'Acerte 4 de até 6 perguntas de Parasitologia. A cada erro eu explico o motivo — e as perguntas mudam a cada tentativa.',
    successText: 'Muito bem, {nome}! Você foi aprovado(a) no questionário de Parasitologia.',
    failText: 'Ainda não foi desta vez, {nome}. Reveja os quadros clínicos da aula e tente de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'parasitologia', skill: 'endoparasitas', xp: 20 },
      { type: 'mastery', discipline: 'parasitologia', skill: 'ciclos', xp: 15 },
      { type: 'objective', quest: 'q_disc_parasitologia', objective: 'o_quiz' },
    ],
  },
  quiz_farmacologia: {
    id: 'quiz_farmacologia',
    title: 'Questionário de Farmacologia',
    npc: 'ines',
    pool: 'farmacologia',
    required: 4,
    maxQuestions: 6,
    intro: 'Acerte 4 de até 6 perguntas de Farmacologia. A cada erro eu explico o motivo — e as perguntas mudam a cada tentativa.',
    successText: 'Muito bem, {nome}! Você foi aprovado(a) no questionário de Farmacologia.',
    failText: 'Ainda não foi desta vez, {nome}. Reveja os quadros clínicos da aula e tente de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'farmacologia', skill: 'farmacocinetica', xp: 20 },
      { type: 'mastery', discipline: 'farmacologia', skill: 'antimicrobianos', xp: 15 },
      { type: 'objective', quest: 'q_disc_farmacologia', objective: 'o_quiz' },
    ],
  },
  quiz_patologia: {
    id: 'quiz_patologia',
    title: 'Questionário de Patologia',
    npc: 'raul',
    pool: 'patologia',
    required: 4,
    maxQuestions: 6,
    intro: 'Acerte 4 de até 6 perguntas de Patologia. A cada erro eu explico o motivo — e as perguntas mudam a cada tentativa.',
    successText: 'Muito bem, {nome}! Você foi aprovado(a) no questionário de Patologia.',
    failText: 'Ainda não foi desta vez, {nome}. Reveja os quadros clínicos da aula e tente de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'patologia', skill: 'geral', xp: 20 },
      { type: 'mastery', discipline: 'patologia', skill: 'oncologia', xp: 15 },
      { type: 'objective', quest: 'q_disc_patologia', objective: 'o_quiz' },
    ],
  },
  quiz_cirurgia: {
    id: 'quiz_cirurgia',
    title: 'Questionário de Cirurgia e Anestesiologia',
    npc: 'beatriz',
    pool: 'cirurgia',
    required: 4,
    maxQuestions: 6,
    intro: 'Acerte 4 de até 6 perguntas de Cirurgia e Anestesiologia. A cada erro eu explico o motivo — e as perguntas mudam a cada tentativa.',
    successText: 'Muito bem, {nome}! Você foi aprovado(a) no questionário de Cirurgia e Anestesiologia.',
    failText: 'Ainda não foi desta vez, {nome}. Reveja os quadros clínicos da aula e tente de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'cirurgia', skill: 'assepsia', xp: 20 },
      { type: 'mastery', discipline: 'cirurgia', skill: 'monitorizacao', xp: 15 },
      { type: 'objective', quest: 'q_disc_cirurgia', objective: 'o_quiz' },
    ],
  },
  quiz_saude_publica: {
    id: 'quiz_saude_publica',
    title: 'Questionário de Saúde Pública',
    npc: 'tomas',
    pool: 'saude_publica',
    required: 4,
    maxQuestions: 6,
    intro: 'Acerte 4 de até 6 perguntas de Saúde Pública. A cada erro eu explico o motivo — e as perguntas mudam a cada tentativa.',
    successText: 'Muito bem, {nome}! Você foi aprovado(a) no questionário de Saúde Pública.',
    failText: 'Ainda não foi desta vez, {nome}. Reveja os quadros clínicos da aula e tente de novo: as perguntas serão outras.',
    onComplete: [
      { type: 'mastery', discipline: 'saude_publica', skill: 'zoonoses', xp: 20 },
      { type: 'mastery', discipline: 'saude_publica', skill: 'inspecao', xp: 15 },
      { type: 'objective', quest: 'q_disc_saude_publica', objective: 'o_quiz' },
    ],
  },
};
