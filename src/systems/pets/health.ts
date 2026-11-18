/**
 * Carteira de saúde dos pets: itens aplicáveis, pendências e pontuação da consulta preventiva.
 * Funções puras (testadas em tests/pets.test.ts).
 */
import { CARE_DISTRACTORS, CARE_ITEMS, PET_MONTH_MS, type CareDistractor, type CareItem } from '../../content/petHealth';
import type { PetKind } from '../../content/pets';

export type CareStatus = 'pendente' | 'vence_logo' | 'em_dia';

export function careItemsFor(kind: PetKind): CareItem[] {
  return CARE_ITEMS.filter((i) => i.kinds.includes(kind));
}

export function distractorsFor(kind: PetKind): CareDistractor[] {
  return CARE_DISTRACTORS.filter((d) => d.kinds.includes(kind));
}

export function careStatus(item: CareItem, health: Record<string, number> | undefined, now: number): { status: CareStatus; dueAt: number | null } {
  const last = health?.[item.id];
  if (!last) return { status: 'pendente', dueAt: null };
  if (item.intervalMonths === 0) return { status: 'em_dia', dueAt: null };
  const dueAt = last + item.intervalMonths * PET_MONTH_MS;
  if (now >= dueAt) return { status: 'pendente', dueAt };
  if (dueAt - now <= PET_MONTH_MS) return { status: 'vence_logo', dueAt };
  return { status: 'em_dia', dueAt };
}

export function dueItems(kind: PetKind, health: Record<string, number> | undefined, now: number): CareItem[] {
  return careItemsFor(kind).filter((i) => careStatus(i, health, now).status === 'pendente');
}

export interface CheckupResult {
  /** itens pendentes que foram corretamente escolhidos (serão registrados como feitos) */
  done: string[];
  /** itens pendentes esquecidos */
  missed: string[];
  wrong: CareDistractor[];
  critical: CareDistractor[];
  breedCorrect: boolean;
  score: number; // 0–100
  passed: boolean;
}

/**
 * Pontuação: 70 pts proporcionais aos cuidados pendentes escolhidos, 30 pts pela pergunta da raça;
 * −15 por escolha incorreta; escolha crítica zera a consulta.
 */
export function scoreCheckup(kind: PetKind, health: Record<string, number> | undefined, chosen: string[], breedCorrect: boolean, now: number): CheckupResult {
  const due = dueItems(kind, health, now);
  const chosenSet = new Set(chosen);
  const done = due.filter((i) => chosenSet.has(i.id)).map((i) => i.id);
  const missed = due.filter((i) => !chosenSet.has(i.id)).map((i) => i.id);
  const ds = distractorsFor(kind).filter((d) => chosenSet.has(d.id));
  const wrong = ds.filter((d) => d.category === 'incorrect');
  const critical = ds.filter((d) => d.category === 'critical');
  let score = (due.length ? 70 * (done.length / due.length) : 70) + (breedCorrect ? 30 : 0) - 15 * wrong.length;
  if (critical.length) score = 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { done, missed, wrong, critical, breedCorrect, score, passed: critical.length === 0 && score >= 60 };
}
