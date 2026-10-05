import type { RawCardRow } from '@/domain/importPreview';
import { SET_COLORS, type Card, type CardContent, type StudySet } from '@/domain/models';
import { nowIso } from '@/lib/id';
import type { SetInput } from '../setsRepository';
import { ImportError } from './errors';
import {
  isObject,
  readAlias,
  readOneOf,
  readString,
  readStringArray,
  type JsonObject,
} from './validation';

export const SET_EXPORT_FORMAT = 'lexicards.set';
export const SET_EXPORT_VERSION = 1;
export const BACKUP_FORMAT = 'lexicards.backup';

/** Export d'un set : son contenu uniquement, sans progression ni marquages personnels. */
export interface SetExport {
  format: typeof SET_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  set: SetInput;
  cards: CardContent[];
}

export function buildSetExport(set: StudySet, cards: readonly Card[]): SetExport {
  return {
    format: SET_EXPORT_FORMAT,
    version: SET_EXPORT_VERSION,
    exportedAt: nowIso(),
    set: {
      title: set.title,
      description: set.description,
      sourceLang: set.sourceLang,
      targetLang: set.targetLang,
      color: set.color,
      tags: set.tags,
    },
    cards: cards.map((card) => ({
      term: card.term,
      translation: card.translation,
      example: card.example,
      note: card.note,
      imageUrl: card.imageUrl,
      partOfSpeech: card.partOfSpeech,
      gender: card.gender,
    })),
  };
}

const FIELD_ALIASES: Record<keyof CardContent, readonly string[]> = {
  term: ['term', 'terme', 'word', 'mot', 'front', 'recto'],
  translation: ['translation', 'traduction', 'definition', 'définition', 'back', 'verso'],
  example: ['example', 'exemple', 'sentence', 'phrase'],
  note: ['note', 'notes'],
  imageUrl: ['imageUrl', 'image', 'imageURL'],
  partOfSpeech: ['partOfSpeech', 'categorie', 'catégorie', 'category'],
  gender: ['gender', 'genre'],
};

function toRawRow(item: unknown, index: number): RawCardRow {
  const fields: RawCardRow['fields'] = {};
  if (isObject(item)) {
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      keyof CardContent,
      readonly string[],
    ][]) {
      const value = readAlias(item, aliases);
      if (value !== undefined) fields[field] = value;
    }
  }
  return { line: index + 1, fields };
}

function readSetMeta(source: JsonObject): Partial<SetInput> {
  const meta: Partial<SetInput> = {};
  const title = readString(source.title);
  if (title) meta.title = title;
  const description = readString(source.description);
  if (description) meta.description = description;
  const sourceLang = readString(source.sourceLang);
  if (sourceLang) meta.sourceLang = sourceLang;
  const targetLang = readString(source.targetLang);
  if (targetLang) meta.targetLang = targetLang;
  meta.color = readOneOf(source.color, SET_COLORS, 'teal');
  meta.tags = readStringArray(source.tags);
  return meta;
}

export interface JsonCardsImport {
  /** Métadonnées du set d'origine, pour préremplir un nouveau set. */
  setMeta?: Partial<SetInput>;
  rows: RawCardRow[];
}

/**
 * Lit des cartes au format JSON. Formats acceptés :
 * - un export de set LexiCards ;
 * - un tableau d'objets `{ term, translation, example }` (ou noms français `terme`, `traduction`…) ;
 * - un objet contenant un tableau `cards`.
 */
export function parseCardsJson(text: string): JsonCardsImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new ImportError('invalidJson');
  }

  if (Array.isArray(parsed)) return finish({ rows: parsed.map(toRawRow) });
  if (!isObject(parsed)) throw new ImportError('unsupportedFormat');
  if (parsed.format === BACKUP_FORMAT) throw new ImportError('isBackup');

  if (parsed.format === SET_EXPORT_FORMAT) {
    if (typeof parsed.version !== 'number' || parsed.version > SET_EXPORT_VERSION) {
      throw new ImportError('unsupportedVersion');
    }
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    const setMeta = isObject(parsed.set) ? readSetMeta(parsed.set) : undefined;
    return finish({ rows: cards.map(toRawRow), ...(setMeta ? { setMeta } : {}) });
  }

  if (Array.isArray(parsed.cards)) {
    return finish({ rows: parsed.cards.map(toRawRow), setMeta: readSetMeta(parsed) });
  }
  throw new ImportError('unsupportedFormat');
}

function finish(result: JsonCardsImport): JsonCardsImport {
  if (result.rows.length === 0) throw new ImportError('empty');
  return result;
}
