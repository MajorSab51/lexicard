import { isBlankCard, parseTags, sanitizeCardContent } from '@/domain/cards';
import type { Card, CardContent, Id, StudySet } from '@/domain/models';
import { cleanText } from '@/domain/text';
import { createId, nowIso } from '@/lib/id';
import { buildCard, getSetCards } from './cardsRepository';
import { db, requestPersistentStorage } from './db';

export type SetInput = Pick<
  StudySet,
  'title' | 'description' | 'sourceLang' | 'targetLang' | 'color' | 'tags'
>;

/** Ligne de l'éditeur : `id` absent pour une nouvelle carte. */
export interface EditorRow {
  id?: Id;
  content: CardContent;
}

function sanitizeSetInput(input: SetInput): SetInput {
  return {
    title: cleanText(input.title).slice(0, 200),
    description: input.description.trim(),
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    color: input.color,
    tags: parseTags(input.tags.join(',')),
  };
}

export async function createSet(input: SetInput, contents: CardContent[] = []): Promise<StudySet> {
  const now = nowIso();
  const set: StudySet = {
    id: createId(),
    userId: null,
    ...sanitizeSetInput(input),
    createdAt: now,
    updatedAt: now,
  };
  const cards = contents
    .map((content) => sanitizeCardContent(content))
    .filter((content) => !isBlankCard(content))
    .map((content, order) => buildCard(set.id, content, order, now));

  await db.transaction('rw', db.sets, db.cards, async () => {
    await db.sets.add(set);
    await db.cards.bulkAdd(cards);
  });
  void requestPersistentStorage();
  return set;
}

export async function updateSet(id: Id, input: SetInput): Promise<void> {
  await db.sets.update(id, { ...sanitizeSetInput(input), updatedAt: nowIso() });
}

/** Met à jour la date de modification d'un set (après un changement de ses cartes). */
export async function touchSet(id: Id, at = nowIso()): Promise<void> {
  await db.sets.update(id, { updatedAt: at });
}

/**
 * Enregistre un set et toutes ses cartes depuis l'éditeur, en une seule transaction :
 * les lignes vides sont ignorées, l'ordre des lignes devient l'ordre des cartes,
 * et les cartes absentes de la liste sont supprimées avec leur progression.
 */
export async function saveSetWithCards(
  setId: Id | null,
  input: SetInput,
  rows: EditorRow[],
): Promise<Id> {
  if (!setId) {
    const set = await createSet(
      input,
      rows.map((row) => row.content),
    );
    return set.id;
  }

  const now = nowIso();
  await db.transaction('rw', db.sets, db.cards, db.progress, async () => {
    const existing = await db.cards.where('setId').equals(setId).toArray();
    const existingById = new Map(existing.map((card) => [card.id, card]));
    const kept = new Set<Id>();
    const toPut: Card[] = [];

    rows
      .map((row) => ({ id: row.id, content: sanitizeCardContent(row.content) }))
      .filter((row) => !isBlankCard(row.content))
      .forEach((row, order) => {
        const previous = row.id ? existingById.get(row.id) : undefined;
        if (previous) {
          kept.add(previous.id);
          if (hasChanged(previous, row.content, order)) {
            toPut.push({ ...previous, ...row.content, order, updatedAt: now });
          }
        } else {
          toPut.push(buildCard(setId, row.content, order, now));
        }
      });

    const removed = existing.filter((card) => !kept.has(card.id)).map((card) => card.id);
    await db.sets.update(setId, { ...sanitizeSetInput(input), updatedAt: now });
    await db.cards.bulkPut(toPut);
    await db.cards.bulkDelete(removed);
    await db.progress.bulkDelete(removed);
  });
  return setId;
}

function hasChanged(card: Card, content: CardContent, order: number): boolean {
  if (card.order !== order) return true;
  return (Object.keys(content) as (keyof CardContent)[]).some((key) => card[key] !== content[key]);
}

/**
 * Supprime un set, ses cartes et leur progression.
 * L'historique des révisions est conservé pour ne pas fausser la série de jours ni les graphiques.
 */
export async function deleteSet(id: Id): Promise<void> {
  await db.transaction('rw', db.sets, db.cards, db.progress, async () => {
    const cardIds = await db.cards.where('setId').equals(id).primaryKeys();
    await db.progress.bulkDelete(cardIds);
    await db.cards.bulkDelete(cardIds);
    await db.sets.delete(id);
  });
}

/** Copie un set et ses cartes. La progression n'est pas copiée : les cartes repartent de zéro. */
export async function duplicateSet(id: Id, title: string): Promise<StudySet> {
  const source = await db.sets.get(id);
  if (!source) throw new Error(`Set introuvable : ${id}`);
  const cards = await getSetCards(id);
  const now = nowIso();
  const copy: StudySet = { ...source, id: createId(), title, createdAt: now, updatedAt: now };
  const copies = cards.map((card) => ({
    ...card,
    id: createId(),
    setId: copy.id,
    createdAt: now,
    updatedAt: now,
  }));
  await db.transaction('rw', db.sets, db.cards, async () => {
    await db.sets.add(copy);
    await db.cards.bulkAdd(copies);
  });
  return copy;
}
