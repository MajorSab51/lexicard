import { DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from '@/domain/languages';
import {
  GENDERS,
  PARTS_OF_SPEECH,
  SET_COLORS,
  type Card,
  type CardProgress,
  type CardStatus,
  type ReviewLog,
  type ReviewResult,
  type Setting,
  type StudyMode,
  type StudySet,
} from '@/domain/models';
import { nowIso } from '@/lib/id';
import { db } from '../db';
import { ImportError } from './errors';
import { BACKUP_FORMAT } from './json';
import {
  isObject,
  readBoolean,
  readNumber,
  readOneOf,
  readString,
  readStringArray,
  type JsonObject,
} from './validation';

export const BACKUP_VERSION = 1;

export interface BackupData {
  sets: StudySet[];
  cards: Card[];
  progress: CardProgress[];
  reviewLogs: ReviewLog[];
  settings: Setting[];
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export type BackupCounts = Record<keyof BackupData, number>;

export function countBackup(data: BackupData): BackupCounts {
  return {
    sets: data.sets.length,
    cards: data.cards.length,
    progress: data.progress.length,
    reviewLogs: data.reviewLogs.length,
    settings: data.settings.length,
  };
}

/** Sauvegarde complète de toutes les tables, lue dans une transaction cohérente. */
export async function createBackup(): Promise<Backup> {
  const data = await db.transaction(
    'r',
    [db.sets, db.cards, db.progress, db.reviewLogs, db.settings],
    async () => ({
      sets: await db.sets.toArray(),
      cards: await db.cards.toArray(),
      progress: await db.progress.toArray(),
      reviewLogs: await db.reviewLogs.toArray(),
      settings: await db.settings.toArray(),
    }),
  );
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: nowIso(), data };
}

const STUDY_MODES: readonly StudyMode[] = ['flashcards', 'learn', 'write', 'test', 'match'];
const REVIEW_RESULTS: readonly ReviewResult[] = ['again', 'hard', 'good', 'easy'];
const CARD_STATUSES: readonly CardStatus[] = ['new', 'learning', 'mastered'];

function readUserId(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readSet(item: JsonObject, now: string): StudySet | null {
  const id = readString(item.id);
  const title = readString(item.title);
  if (!id || !title) return null;
  return {
    id,
    userId: readUserId(item.userId),
    title,
    description: readString(item.description),
    sourceLang: readString(item.sourceLang, DEFAULT_SOURCE_LANG) || DEFAULT_SOURCE_LANG,
    targetLang: readString(item.targetLang, DEFAULT_TARGET_LANG) || DEFAULT_TARGET_LANG,
    color: readOneOf(item.color, SET_COLORS, 'teal'),
    tags: readStringArray(item.tags),
    createdAt: readString(item.createdAt, now),
    updatedAt: readString(item.updatedAt, now),
  };
}

function readCard(item: JsonObject, now: string): Card | null {
  const id = readString(item.id);
  const setId = readString(item.setId);
  const term = readString(item.term);
  const translation = readString(item.translation);
  if (!id || !setId || !term || !translation) return null;
  return {
    id,
    userId: readUserId(item.userId),
    setId,
    term,
    translation,
    example: readString(item.example),
    note: readString(item.note),
    imageUrl: readString(item.imageUrl),
    partOfSpeech: readOneOf(item.partOfSpeech, ['', ...PARTS_OF_SPEECH], ''),
    gender: readOneOf(item.gender, ['', ...GENDERS], ''),
    order: readNumber(item.order, 0),
    favorite: readBoolean(item.favorite),
    difficult: readBoolean(item.difficult),
    createdAt: readString(item.createdAt, now),
    updatedAt: readString(item.updatedAt, now),
  };
}

function readProgress(item: JsonObject): CardProgress | null {
  const cardId = readString(item.cardId);
  const dueDate = readString(item.dueDate);
  if (!cardId || !dueDate) return null;
  return {
    cardId,
    userId: readUserId(item.userId),
    interval: readNumber(item.interval, 0),
    easeFactor: readNumber(item.easeFactor, 2.5),
    repetitions: readNumber(item.repetitions, 0),
    dueDate,
    lastReviewedAt: typeof item.lastReviewedAt === 'string' ? item.lastReviewedAt : null,
    lapses: readNumber(item.lapses, 0),
    status: readOneOf(item.status, CARD_STATUSES, 'learning'),
  };
}

function readReviewLog(item: JsonObject): ReviewLog | null {
  const id = readString(item.id);
  const cardId = readString(item.cardId);
  const setId = readString(item.setId);
  const reviewedAt = readString(item.reviewedAt);
  const mode = readOneOf<StudyMode | ''>(item.mode, STUDY_MODES, '');
  const result = readOneOf<ReviewResult | ''>(item.result, REVIEW_RESULTS, '');
  if (!id || !cardId || !setId || !reviewedAt || !mode || !result) return null;
  return {
    id,
    userId: readUserId(item.userId),
    cardId,
    setId,
    mode,
    result,
    durationMs: readNumber(item.durationMs, 0),
    reviewedAt,
  };
}

function readList<T>(value: unknown, reader: (item: JsonObject) => T | null): [T[], number] {
  if (!Array.isArray(value)) return [[], 0];
  const items: T[] = [];
  let skipped = 0;
  for (const item of value) {
    const parsed = isObject(item) ? reader(item) : null;
    if (parsed) items.push(parsed);
    else skipped += 1;
  }
  return [items, skipped];
}

export interface ParsedBackup {
  backup: Backup;
  /** Éléments illisibles ou orphelins (carte sans set, progression sans carte…) écartés. */
  skipped: number;
}

/** Valide une sauvegarde. Les éléments incohérents sont écartés plutôt que de tout bloquer. */
export function parseBackup(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new ImportError('invalidJson');
  }
  if (!isObject(parsed) || parsed.format !== BACKUP_FORMAT || !isObject(parsed.data)) {
    throw new ImportError('notBackup');
  }
  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    throw new ImportError('unsupportedVersion');
  }

  const now = nowIso();
  const { data } = parsed;
  const [sets, skippedSets] = readList(data.sets, (item) => readSet(item, now));
  const setIds = new Set(sets.map((set) => set.id));
  const [allCards, skippedCards] = readList(data.cards, (item) => readCard(item, now));
  const cards = allCards.filter((card) => setIds.has(card.setId));
  const cardIds = new Set(cards.map((card) => card.id));
  const [allProgress, skippedProgress] = readList(data.progress, readProgress);
  const progress = allProgress.filter((entry) => cardIds.has(entry.cardId));
  const [reviewLogs, skippedLogs] = readList(data.reviewLogs, readReviewLog);
  const [settings, skippedSettings] = readList(data.settings, (item) =>
    typeof item.key === 'string' ? { key: item.key, value: item.value } : null,
  );

  const skipped =
    skippedSets +
    skippedCards +
    (allCards.length - cards.length) +
    skippedProgress +
    (allProgress.length - progress.length) +
    skippedLogs +
    skippedSettings;

  return {
    backup: {
      format: BACKUP_FORMAT,
      version: parsed.version,
      exportedAt: readString(parsed.exportedAt, now),
      data: { sets, cards, progress, reviewLogs, settings },
    },
    skipped,
  };
}

/** Remplace toutes les données par celles de la sauvegarde, en une seule transaction. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const tables = [db.sets, db.cards, db.progress, db.reviewLogs, db.settings];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()));
    await db.sets.bulkPut(backup.data.sets);
    await db.cards.bulkPut(backup.data.cards);
    await db.progress.bulkPut(backup.data.progress);
    await db.reviewLogs.bulkPut(backup.data.reviewLogs);
    await db.settings.bulkPut(backup.data.settings);
  });
}
