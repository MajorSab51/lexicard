import Dexie, { type EntityTable } from 'dexie';
import type { Card, CardProgress, ReviewLog, Setting, StudySet } from '@/domain/models';

export type LexiCardsDatabase = Dexie & {
  sets: EntityTable<StudySet, 'id'>;
  cards: EntityTable<Card, 'id'>;
  progress: EntityTable<CardProgress, 'cardId'>;
  reviewLogs: EntityTable<ReviewLog, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

export const DATABASE_NAME = 'lexicards';

/**
 * Schéma IndexedDB. Chaque évolution doit ajouter une nouvelle `version(n)`
 * (avec `upgrade()` si les données existantes doivent être transformées)
 * sans jamais modifier les versions précédentes.
 */
export function createDatabase(name: string): LexiCardsDatabase {
  const database = new Dexie(name) as LexiCardsDatabase;
  database.version(1).stores({
    sets: 'id, userId, updatedAt, sourceLang, targetLang, *tags',
    cards: 'id, userId, setId, [setId+order]',
    progress: 'cardId, userId, dueDate, status',
    reviewLogs: 'id, userId, cardId, setId, reviewedAt',
    settings: 'key',
  });
  // Jalon 3 : jour d'introduction des cartes, pour la limite de nouvelles cartes par jour.
  database
    .version(2)
    .stores({ progress: 'cardId, userId, dueDate, status, introducedOn' })
    .upgrade((tx) =>
      tx
        .table<Partial<CardProgress>>('progress')
        .toCollection()
        .modify((progress) => {
          progress.introducedOn ??= null;
        }),
    );
  return database;
}

export const db = createDatabase(DATABASE_NAME);

/** Tables de données, dans l'ordre utilisé pour les sauvegardes. */
export const ALL_TABLES = ['sets', 'cards', 'progress', 'reviewLogs', 'settings'] as const;

/**
 * Demande au navigateur de ne pas effacer les données en cas de manque d'espace.
 * Firefox peut afficher une demande d'autorisation : on l'appelle donc au moment
 * où l'utilisateur enregistre ses premières données, pas au démarrage.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean | null> {
  try {
    if (!('storage' in navigator) || typeof navigator.storage.persisted !== 'function') return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}
