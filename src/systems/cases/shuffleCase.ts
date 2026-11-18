import type { ClinicalCase } from './caseTypes';
import { seededRandom, shuffle } from '../questions/bank';
import { hashString } from '../../art/pixel';

/**
 * A cada nova tentativa, a ordem de perguntas, exames, hipóteses e condutas é embaralhada
 * (mantendo os grupos), para que o aluno não decore posições ao repetir o caso.
 */
export function shuffledCase(c: ClinicalCase, attempt: number): ClinicalCase {
  const rand = seededRandom(hashString(c.id) + attempt * 7919);
  const keepGroups = <T,>(items: T[], groupOf: (t: T) => string): T[] => {
    const order = Array.from(new Set(items.map(groupOf)));
    return shuffle(items, rand).sort((a, b) => order.indexOf(groupOf(a)) - order.indexOf(groupOf(b)));
  };
  return {
    ...c,
    anamnesis: { questions: keepGroups(c.anamnesis.questions, (q) => q.category) },
    physicalExam: { items: keepGroups(c.physicalExam.items, (i) => i.group) },
    tests: { ...c.tests, items: shuffle(c.tests.items, rand) },
    diagnosis: { ...c.diagnosis, hypotheses: shuffle(c.diagnosis.hypotheses, rand) },
    conduct: { ...c.conduct, options: shuffle(c.conduct.options, rand) },
  };
}

