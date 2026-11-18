import type { Sex } from './types';

/**
 * Concordância de gênero nos textos dirigidos ao jogador.
 * Só troca palavras de uma lista conhecida (que, nos diálogos, sempre se referem ao jogador);
 * expressões genéricas como "médico(a)-veterinário(a)" ou "tutor(a)" permanecem neutras.
 * Sem sexo definido (saves antigos), o texto fica como está.
 */
const PLAYER_WORDS = ['bem-vindo', 'pronto', 'nervoso', 'animado', 'obrigado', 'preparado', 'rápido', 'objetivo', 'doutor', 'mesmo', 'ansioso', 'atento', 'cuidadoso', 'convidado', 'aprovado'];
const WORD_RE = new RegExp(`(?<![\\p{L}-])(${PLAYER_WORDS.join('|')})\\(a\\)`, 'giu');

export function genderize(text: string, sex: Sex | undefined): string {
  if (!sex) return text;
  const fem = sex === 'feminino';
  return text
    .replace(/(?<![\p{L}])o\(a\) estudante/gu, fem ? 'a estudante' : 'o estudante')
    .replace(/(?<![\p{L}])O\(a\) estudante/gu, fem ? 'A estudante' : 'O estudante')
    .replace(WORD_RE, (_m, w: string) => {
      if (!fem) return w;
      if (/doutor$/i.test(w)) return w + 'a';
      return w.slice(0, -1) + (w.endsWith('O') ? 'A' : 'a');
    });
}
