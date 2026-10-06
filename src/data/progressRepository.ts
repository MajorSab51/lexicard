import { toLocalDay, type LocalDay } from '@/domain/dates';
import type { Card, CardProgress, Id, StudyMode, StudySet } from '@/domain/models';
import { applyReview, type Grade } from '@/domain/srs';
import { getSetCards } from './cardsRepository';
import { db } from './db';
import { logReview } from './reviewLogsRepository';
import { readSetting, SETTINGS } from './settingsRepository';

function toProgressMap(entries: readonly (CardProgress | undefined)[]): Map<Id, CardProgress> {
  const map = new Map<Id, CardProgress>();
  for (const entry of entries) if (entry) map.set(entry.cardId, entry);
  return map;
}

/** Progression de plusieurs cartes ; les cartes nouvelles n'y figurent pas. */
export async function getProgressMap(cardIds: readonly Id[]): Promise<Map<Id, CardProgress>> {
  return toProgressMap(await db.progress.bulkGet([...cardIds]));
}

/** Nombre de cartes étudiées pour la première fois ce jour-là, tous sets confondus. */
export function countIntroducedOn(day: LocalDay): Promise<number> {
  return db.progress.where('introducedOn').equals(day).count();
}

export interface AnswerInput {
  cardId: Id;
  grade: Grade;
  mode: StudyMode;
  durationMs: number;
  /** Faux pour une réponse qui ne replanifie pas la carte (carte revue en fin de session). */
  updateSchedule: boolean;
}

/**
 * Enregistre une réponse notée : nouvelle planification SM-2 et entrée d'historique,
 * dans une même transaction. Retourne `false` si la carte a été supprimée entre-temps.
 */
export async function recordAnswer(input: AnswerInput, now = new Date()): Promise<boolean> {
  return db.transaction('rw', db.cards, db.progress, db.reviewLogs, async () => {
    const card = await db.cards.get(input.cardId);
    if (!card) return false;
    if (input.updateSchedule) {
      const previous = await db.progress.get(card.id);
      await db.progress.put(applyReview(previous, card.id, input.grade, now));
    }
    await logReview(
      {
        cardId: card.id,
        setId: card.setId,
        mode: input.mode,
        result: input.grade,
        durationMs: input.durationMs,
      },
      now.toISOString(),
    );
    return true;
  });
}

export interface StudyScope {
  today: LocalDay;
  /** Cartes concernées, dans l'ordre de lecture : sets du plus récent au plus ancien, puis ordre du set. */
  cards: Card[];
  sets: Map<Id, StudySet>;
  progress: Map<Id, CardProgress>;
  /** Limite quotidienne de nouvelles cartes, partagée par tous les sets. */
  newLimit: number;
  /** Cartes déjà introduites aujourd'hui, tous sets confondus. */
  introducedToday: number;
}

async function scopeCards(setId: Id | null): Promise<{ sets: StudySet[]; cards: Card[] }> {
  if (setId) {
    const set = await db.sets.get(setId);
    return { sets: set ? [set] : [], cards: set ? await getSetCards(setId) : [] };
  }
  const sets = await db.sets.orderBy('updatedAt').reverse().toArray();
  const bySet = new Map<Id, Card[]>();
  for (const card of await db.cards.toArray()) {
    const list = bySet.get(card.setId);
    if (list) list.push(card);
    else bySet.set(card.setId, [card]);
  }
  const cards = sets.flatMap((set) => (bySet.get(set.id) ?? []).sort((a, b) => a.order - b.order));
  return { sets, cards };
}

/** Instantané des données d'une session : un set, ou tous les sets (`null`). */
export async function loadStudyScope(setId: Id | null, now = new Date()): Promise<StudyScope> {
  const today = toLocalDay(now);
  return db.transaction('r', [db.sets, db.cards, db.progress, db.settings], async () => {
    const { sets, cards } = await scopeCards(setId);
    const progress = setId
      ? await getProgressMap(cards.map((card) => card.id))
      : toProgressMap(await db.progress.toArray());

    return {
      today,
      cards,
      sets: new Map(sets.map((set) => [set.id, set])),
      progress,
      newLimit: await readSetting(SETTINGS.newCardsPerDay),
      introducedToday: await countIntroducedOn(today),
    };
  });
}
