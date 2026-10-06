import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, toLocalDay, type LocalDay } from '@/domain/dates';
import type { Card, CardProgress, Id } from '@/domain/models';
import {
  computeStreak,
  dailyActivity,
  goalProgress,
  hardestCards,
  successRate,
  type CardDifficulty,
  type DailyGoal,
  type DayActivity,
  type GoalProgress,
  type Streak,
  type SuccessRate,
} from '@/domain/stats';
import { countSrs, type SrsCounts } from '@/domain/studyPlan';
import { getSetCards } from './cardsRepository';
import { db } from './db';
import { getProgressMap } from './progressRepository';
import { readSetting, SETTINGS } from './settingsRepository';
import { getActiveDays, getLogsBetween } from './statsRepository';

/*
 * Requêtes réactives des statistiques : elles se recalculent après chaque révision enregistrée.
 * `undefined` signifie « chargement en cours ».
 */

export interface TodayProgress {
  today: LocalDay;
  streak: Streak;
  goal: DailyGoal;
  progress: GoalProgress;
}

async function loadTodayProgress(today: LocalDay): Promise<TodayProgress> {
  const [days, logs, goal] = await Promise.all([
    getActiveDays(),
    getLogsBetween(today, today),
    readSetting(SETTINGS.dailyGoal),
  ]);
  const [activity] = dailyActivity(logs, today, today);
  return {
    today,
    streak: computeStreak(days, today),
    goal,
    progress: goalProgress(activity, goal),
  };
}

/** Série de jours et objectif du jour (accueil). */
export function useTodayProgress(): TodayProgress | undefined {
  return useLiveQuery(() => loadTodayProgress(toLocalDay(new Date())), []);
}

export interface StatsOverview extends TodayProgress {
  /** Activité de chaque jour de la période, du plus ancien au plus récent. */
  activity: DayActivity[];
  success: SuccessRate;
}

/** Statistiques des `periodDays` derniers jours, aujourd'hui compris. */
export function useStatsOverview(periodDays: number): StatsOverview | undefined {
  return useLiveQuery(async () => {
    const today = toLocalDay(new Date());
    const from = addDays(today, -(periodDays - 1));
    const [base, logs] = await Promise.all([loadTodayProgress(today), getLogsBetween(from, today)]);
    return { ...base, activity: dailyActivity(logs, from, today), success: successRate(logs) };
  }, [periodDays]);
}

/** Répartition des cartes par niveau pour chaque set. */
export function useSetsProgress(): Map<Id, SrsCounts> | undefined {
  return useLiveQuery(async () => {
    const [cards, entries] = await Promise.all([db.cards.toArray(), db.progress.toArray()]);
    const progress = new Map<Id, CardProgress>(entries.map((entry) => [entry.cardId, entry]));
    const idsBySet = new Map<Id, Id[]>();
    for (const card of cards) {
      const ids = idsBySet.get(card.setId);
      if (ids) ids.push(card.id);
      else idsBySet.set(card.setId, [card.id]);
    }
    const today = toLocalDay(new Date());
    return new Map(
      [...idsBySet.entries()].map(([setId, ids]) => [setId, countSrs(ids, progress, today)]),
    );
  }, []);
}

export const SET_STATS_RECENT_DAYS = 30;

export interface SetStats {
  counts: SrsCounts;
  /** Taux de réussite sur tout l'historique du set. */
  success: SuccessRate;
  /** Réponses données ces 30 derniers jours. */
  recentReviews: number;
  hardest: (CardDifficulty & { card: Card })[];
}

export function useSetStats(setId: Id | undefined): SetStats | undefined {
  return useLiveQuery(async () => {
    const cards = setId ? await getSetCards(setId) : [];
    const ids = cards.map((card) => card.id);
    const [progress, logs] = await Promise.all([
      getProgressMap(ids),
      setId ? db.reviewLogs.where('setId').equals(setId).toArray() : [],
    ]);
    const today = toLocalDay(new Date());
    const since = addDays(today, -(SET_STATS_RECENT_DAYS - 1));
    const cardsById = new Map(cards.map((card) => [card.id, card]));
    // Les cartes supprimées gardent leur historique, mais ne figurent pas dans le classement.
    const existingLogs = logs.filter((log) => cardsById.has(log.cardId));

    return {
      counts: countSrs(ids, progress, today),
      success: successRate(logs),
      recentReviews: dailyActivity(logs, since, today).reduce((sum, day) => sum + day.reviews, 0),
      hardest: hardestCards(existingLogs, progress).flatMap((difficulty) => {
        const card = cardsById.get(difficulty.cardId);
        return card ? [{ ...difficulty, card }] : [];
      }),
    };
  }, [setId]);
}
