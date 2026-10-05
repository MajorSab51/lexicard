import { isBlankCard, sanitizeCardContent } from '@/domain/cards';
import type { Card, CardContent, Id, IsoDateTime } from '@/domain/models';
import { createId, nowIso } from '@/lib/id';
import { db } from './db';

export function buildCard(
  setId: Id,
  content: CardContent,
  order: number,
  now: IsoDateTime = nowIso(),
): Card {
  return {
    id: createId(),
    userId: null,
    setId,
    ...content,
    order,
    favorite: false,
    difficult: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Cartes d'un set, dans leur ordre d'affichage. */
export function getSetCards(setId: Id): Promise<Card[]> {
  return db.cards.where('[setId+order]').between([setId, -Infinity], [setId, Infinity]).toArray();
}

async function nextOrder(setId: Id): Promise<number> {
  const last = await db.cards
    .where('[setId+order]')
    .between([setId, -Infinity], [setId, Infinity])
    .last();
  return last ? last.order + 1 : 0;
}

/** Ajoute des cartes à la fin d'un set. Retourne le nombre de cartes ajoutées. */
export async function addCards(setId: Id, contents: CardContent[]): Promise<number> {
  const now = nowIso();
  return db.transaction('rw', db.sets, db.cards, async () => {
    const start = await nextOrder(setId);
    const cards = contents
      .map((content) => sanitizeCardContent(content))
      .filter((content) => !isBlankCard(content))
      .map((content, index) => buildCard(setId, content, start + index, now));
    await db.cards.bulkAdd(cards);
    await db.sets.update(setId, { updatedAt: now });
    return cards.length;
  });
}

export type CardFlags = Pick<Card, 'favorite' | 'difficult'>;

export async function setCardFlags(id: Id, flags: Partial<CardFlags>): Promise<void> {
  await db.cards.update(id, { ...flags, updatedAt: nowIso() });
}

/** Supprime des cartes et leur progression (l'historique des révisions est conservé). */
export async function deleteCards(ids: Id[]): Promise<void> {
  const now = nowIso();
  await db.transaction('rw', db.sets, db.cards, db.progress, async () => {
    const cards = await db.cards.bulkGet(ids);
    const setIds = new Set(cards.flatMap((card) => (card ? [card.setId] : [])));
    await db.cards.bulkDelete(ids);
    await db.progress.bulkDelete(ids);
    for (const setId of setIds) await db.sets.update(setId, { updatedAt: now });
  });
}

/**
 * Déplace des cartes à la fin d'un autre set, en gardant leur ordre relatif.
 * La progression suit la carte (elle est liée à l'identifiant de la carte).
 */
export async function moveCards(ids: Id[], targetSetId: Id): Promise<void> {
  const now = nowIso();
  await db.transaction('rw', db.sets, db.cards, async () => {
    if (!(await db.sets.get(targetSetId))) throw new Error(`Set introuvable : ${targetSetId}`);
    const cards = (await db.cards.bulkGet(ids))
      .filter((card): card is Card => card !== undefined && card.setId !== targetSetId)
      .sort((a, b) => a.order - b.order);
    const sourceSetIds = new Set(cards.map((card) => card.setId));
    const start = await nextOrder(targetSetId);
    await db.cards.bulkPut(
      cards.map((card, index) => ({
        ...card,
        setId: targetSetId,
        order: start + index,
        updatedAt: now,
      })),
    );
    for (const setId of [...sourceSetIds, targetSetId]) {
      await db.sets.update(setId, { updatedAt: now });
    }
  });
}
