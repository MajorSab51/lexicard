import { useLiveQuery } from 'dexie-react-hooks';
import type { Card, Id, StudySet } from '@/domain/models';
import { getSetCards } from './cardsRepository';
import { db } from './db';

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
