import { useLiveQuery } from 'dexie-react-hooks';
import { toLocalDay, type LocalDay } from '@/domain/dates';
import type { Card, Id, StudySet } from '@/domain/models';
import { countSrs, earliestDueDate, newCardAllowance, type SrsCounts } from '@/domain/studyPlan';
import { getSetCards } from './cardsRepository';
import { db } from './db';
import { countIntroducedOn, getProgressMap } from './progressRepository';
import { readSetting, SETTINGS } from './settingsRepository';

/*
 * Requêtes réactives : les composants se mettent à jour automatiquement
 * dès que les données changent dans IndexedDB (y compris depuis un autre onglet).
 * `undefined` signifie « chargement en cours ».
 */

/** Tous les sets, du plus récemment modifié au plus ancien. */
export function useSets(): StudySet[] | undefined {
  return useLiveQuery(() => db.sets.orderBy('updatedAt').reverse().toArray(), []);
}

/** Un set, ou `null` s'il n'existe pas. */
export function useSet(id: Id | undefined): StudySet | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.sets.get(id)) ?? null) : null), [id]);
}

export function useSetCards(setId: Id | undefined): Card[] | undefined {
  return useLiveQuery(() => (setId ? getSetCards(setId) : []), [setId]);
}

/** Nombre de cartes par set, calculé en une seule lecture de l'index. */
export function useCardCounts(): Map<Id, number> | undefined {
  return useLiveQuery(async () => {
    // L'index `setId` ne contient que des chaînes (identifiants de sets).
    const setIds = (await db.cards.orderBy('setId').keys()) as Id[];
    const counts = new Map<Id, number>();
    for (const setId of setIds) counts.set(setId, (counts.get(setId) ?? 0) + 1);
    return counts;
  }, []);
}

/** Compteurs de répétition espacée d'un set : à réviser aujourd'hui, puis cartes par niveau. */
export function useSetSrsCounts(setId: Id | undefined): SrsCounts | undefined {
  return useLiveQuery(async () => {
    const ids: Id[] = setId ? await db.cards.where('setId').equals(setId).primaryKeys() : [];
    const progress = await getProgressMap(ids);
    return countSrs(ids, progress, toLocalDay(new Date()));
  }, [setId]);
}

export interface DailyOverview {
  today: LocalDay;
  /** Compteurs de toutes les cartes, tous sets confondus. */
  counts: SrsCounts;
  newLimit: number;
  /** Nouvelles cartes proposées aujourd'hui, dans la limite restante du jour. */
  newToday: number;
  /** Jour de la prochaine révision prévue (`null` si aucune carte n'a été étudiée). */
  nextDue: LocalDay | null;
}

/** Vue d'ensemble du jour pour l'accueil, calculée avec les index (sans lire toutes les cartes). */
export function useDailyOverview(): DailyOverview | undefined {
  return useLiveQuery(async () => {
    const today = toLocalDay(new Date());
    const [total, due, learning, mastered, newLimit, introducedToday, first] = await Promise.all([
      db.cards.count(),
      db.progress.where('dueDate').belowOrEqual(today).count(),
      db.progress.where('status').equals('learning').count(),
      db.progress.where('status').equals('mastered').count(),
      readSetting(SETTINGS.newCardsPerDay),
      countIntroducedOn(today),
      db.progress.orderBy('dueDate').first(),
    ]);
    const fresh = Math.max(0, total - learning - mastered);
    return {
      today,
      counts: { total, due, new: fresh, learning, mastered },
      newLimit,
      newToday: Math.min(fresh, newCardAllowance(newLimit, introducedToday)),
      nextDue: first?.dueDate ?? null,
    };
  }, []);
}

/** Prochain jour de révision d'un set, ou de toutes les cartes (`null`). */
export function useNextDue(setId: Id | null): LocalDay | null | undefined {
  return useLiveQuery(async () => {
    if (!setId) return (await db.progress.orderBy('dueDate').first())?.dueDate ?? null;
    const ids: Id[] = await db.cards.where('setId').equals(setId).primaryKeys();
    const progress = await getProgressMap(ids);
    return earliestDueDate(ids, progress);
  }, [setId]);
}
