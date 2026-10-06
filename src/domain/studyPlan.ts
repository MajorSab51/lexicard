import type { LocalDay } from './dates';
import type { CardProgress, CardStatus, Id } from './models';
import { shuffle } from './random';
import { cardStatus, isDue } from './srs';

/** Nouvelles cartes introduites par jour, tous sets confondus (paramétrable). */
export const NEW_CARDS_PER_DAY = { default: 10, min: 0, max: 200 } as const;

export function isNewCardsLimit(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= NEW_CARDS_PER_DAY.min &&
    value <= NEW_CARDS_PER_DAY.max
  );
}

/** Nouvelles cartes encore permises aujourd'hui. */
export function newCardAllowance(limit: number, introducedToday: number): number {
  return Math.max(0, limit - introducedToday);
}

export interface SrsCounts extends Record<CardStatus, number> {
  total: number;
  /** Cartes déjà étudiées dont la révision est prévue aujourd'hui ou en retard. */
  due: number;
}

export function emptyCounts(): SrsCounts {
  return { total: 0, due: 0, new: 0, learning: 0, mastered: 0 };
}

/** Compteurs d'un ensemble de cartes : à réviser, puis répartition par niveau. */
export function countSrs(
  cardIds: Iterable<Id>,
  progress: ReadonlyMap<Id, CardProgress>,
  today: LocalDay,
): SrsCounts {
  const counts = emptyCounts();
  for (const id of cardIds) {
    const entry = progress.get(id);
    counts.total += 1;
    counts[cardStatus(entry)] += 1;
    if (isDue(entry, today)) counts.due += 1;
  }
  return counts;
}

export interface DailyPlan {
  /** Cartes dues, mélangées pour éviter d'apprendre l'ordre par cœur. */
  reviewIds: Id[];
  /** Cartes jamais étudiées, dans l'ordre fourni, dans la limite du jour. */
  newIds: Id[];
}

interface PlanInput {
  /** Cartes concernées, dans leur ordre de lecture (ordre du set). */
  cardIds: readonly Id[];
  progress: ReadonlyMap<Id, CardProgress>;
  today: LocalDay;
  /** Nouvelles cartes encore permises aujourd'hui (voir `newCardAllowance`). */
  newAllowance: number;
  random?: () => number;
}

/** Session du jour : toutes les cartes dues, puis des nouvelles cartes dans la limite du jour. */
export function planDailySession({
  cardIds,
  progress,
  today,
  newAllowance,
  random = Math.random,
}: PlanInput): DailyPlan {
  const due: Id[] = [];
  const fresh: Id[] = [];
  for (const id of cardIds) {
    const entry = progress.get(id);
    if (!entry) fresh.push(id);
    else if (isDue(entry, today)) due.push(id);
  }
  return {
    reviewIds: shuffle(due, random),
    newIds: fresh.slice(0, Math.max(0, newAllowance)),
  };
}

/** Prochain jour de révision parmi des cartes déjà étudiées (`null` si aucune ne l'a été). */
export function earliestDueDate(
  cardIds: Iterable<Id>,
  progress: ReadonlyMap<Id, CardProgress>,
): LocalDay | null {
  let earliest: LocalDay | null = null;
  for (const id of cardIds) {
    const due = progress.get(id)?.dueDate;
    if (due !== undefined && (earliest === null || due < earliest)) earliest = due;
  }
  return earliest;
}
