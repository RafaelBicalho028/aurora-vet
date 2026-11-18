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
};
