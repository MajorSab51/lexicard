import { addDays, daysBetween, toLocalDay, type LocalDay } from './dates';
import type { CardProgress, Id, ReviewLog } from './models';
import { isGrade } from './srs';

/*
 * Statistiques calculées à partir de l'historique des révisions (`ReviewLog`).
 * Les jours sont des jours locaux : une révision à 23 h 59 compte pour le jour même.
 */

type LogLike = Pick<ReviewLog, 'cardId' | 'result' | 'durationMs' | 'reviewedAt'>;

export function reviewDay(log: Pick<ReviewLog, 'reviewedAt'>): LocalDay {
  return toLocalDay(new Date(log.reviewedAt));
}

export interface DayActivity {
  day: LocalDay;
  /** Cartes différentes étudiées ce jour-là, tous modes confondus. */
  cards: number;
  /** Réponses données (une carte peut revenir plusieurs fois dans la journée). */
  reviews: number;
  /** Temps passé à répondre, en millisecondes. */
  durationMs: number;
}

/** Activité de chaque jour de `from` à `to` inclus, jours sans révision compris. */
export function dailyActivity(
  logs: readonly LogLike[],
  from: LocalDay,
  to: LocalDay,
): DayActivity[] {
  const byDay = new Map<LocalDay, { cards: Set<Id>; reviews: number; durationMs: number }>();
  for (const log of logs) {
    const day = reviewDay(log);
    if (day < from || day > to) continue;
    const entry = byDay.get(day) ?? { cards: new Set<Id>(), reviews: 0, durationMs: 0 };
    entry.cards.add(log.cardId);
    entry.reviews += 1;
    entry.durationMs += log.durationMs;
    byDay.set(day, entry);
  }
  const length = Math.max(0, daysBetween(from, to) + 1);
  return Array.from({ length }, (_, index) => {
    const day = addDays(from, index);
    const entry = byDay.get(day);
    return {
      day,
      cards: entry?.cards.size ?? 0,
      reviews: entry?.reviews ?? 0,
      durationMs: entry?.durationMs ?? 0,
    };
  });
}

export interface Streak {
  /** Jours consécutifs avec au moins une révision, jusqu'à aujourd'hui ou hier. */
  current: number;
  longest: number;
  /** Une révision a déjà eu lieu aujourd'hui. */
  activeToday: boolean;
}

/**
 * Série de jours. Un jour compte dès une révision, dans n'importe quel mode. Tant que la
 * journée n'est pas finie, la série d'hier reste en cours : il suffit de réviser aujourd'hui.
 */
export function computeStreak(days: ReadonlySet<LocalDay>, today: LocalDay): Streak {
  const activeToday = days.has(today);
  let current = 0;
  for (let day = activeToday ? today : addDays(today, -1); days.has(day); day = addDays(day, -1)) {
    current += 1;
  }

  let longest = 0;
  let run = 0;
  let previous: LocalDay | null = null;
  for (const day of [...days].sort()) {
    run = previous !== null && daysBetween(previous, day) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  return { current, longest, activeToday };
}

export interface SuccessRate {
  /** Réponses notées (hors cartes simplement consultées). */
  graded: number;
  correct: number;
  /** Part des réponses justes, de 0 à 1 ; `null` sans réponse notée. */
  rate: number | null;
}

/** Taux de réussite : toute réponse notée autre que « Raté » est juste. */
export function successRate(logs: readonly Pick<ReviewLog, 'result'>[]): SuccessRate {
  let graded = 0;
  let correct = 0;
  for (const { result } of logs) {
    if (!isGrade(result)) continue;
    graded += 1;
    if (result !== 'again') correct += 1;
  }
  return { graded, correct, rate: graded === 0 ? null : correct / graded };
}

export interface CardDifficulty {
  cardId: Id;
  /** Réponses « Raté » (ou fausses) dans l'historique. */
  failures: number;
  graded: number;
  easeFactor: number | null;
}

/**
 * Cartes les plus difficiles : le plus d'échecs, puis la plus grande part d'échecs,
 * puis le facteur de facilité le plus bas. Seules les cartes déjà ratées au moins une fois.
 */
export function hardestCards(
  logs: readonly Pick<ReviewLog, 'cardId' | 'result'>[],
  progress: ReadonlyMap<Id, CardProgress>,
  limit = 5,
): CardDifficulty[] {
  const byCard = new Map<Id, { failures: number; graded: number }>();
  for (const { cardId, result } of logs) {
    if (!isGrade(result)) continue;
    const entry = byCard.get(cardId) ?? { failures: 0, graded: 0 };
    entry.graded += 1;
    if (result === 'again') entry.failures += 1;
    byCard.set(cardId, entry);
  }
  return [...byCard.entries()]
    .filter(([, entry]) => entry.failures > 0)
    .map(([cardId, entry]) => ({
      cardId,
      ...entry,
      easeFactor: progress.get(cardId)?.easeFactor ?? null,
    }))
    .sort(
      (a, b) =>
        b.failures - a.failures ||
        b.failures / b.graded - a.failures / a.graded ||
        (a.easeFactor ?? Infinity) - (b.easeFactor ?? Infinity),
    )
    .slice(0, limit);
}

export const GOAL_KINDS = ['cards', 'minutes'] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export interface DailyGoal {
  kind: GoalKind;
  target: number;
}

export const DEFAULT_DAILY_GOAL: DailyGoal = { kind: 'cards', target: 20 };
export const GOAL_LIMITS: Readonly<Record<GoalKind, { min: number; max: number }>> = {
  cards: { min: 1, max: 500 },
  minutes: { min: 1, max: 240 },
};

export function isGoalTarget(kind: GoalKind, value: unknown): value is number {
  const { min, max } = GOAL_LIMITS[kind];
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function isDailyGoal(value: unknown): value is DailyGoal {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, target } = value as Record<string, unknown>;
  return (
    typeof kind === 'string' &&
    (GOAL_KINDS as readonly string[]).includes(kind) &&
    isGoalTarget(kind as GoalKind, target)
  );
}

export interface GoalProgress {
  /** Valeur atteinte : cartes étudiées, ou minutes entières. */
  value: number;
  target: number;
  /** Avancement de 0 à 1. */
  ratio: number;
  reached: boolean;
}

export function goalProgress(today: DayActivity | undefined, goal: DailyGoal): GoalProgress {
  const exact = goal.kind === 'cards' ? (today?.cards ?? 0) : (today?.durationMs ?? 0) / 60_000;
  return {
    value: Math.floor(exact),
    target: goal.target,
    ratio: Math.min(1, exact / goal.target),
    reached: exact >= goal.target,
  };
}
