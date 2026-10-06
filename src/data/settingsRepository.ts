import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_ANSWER_TOLERANCE, isAnswerTolerance } from '@/domain/answers';
import { DEFAULT_FLASHCARD_OPTIONS, isFlashcardOptions } from '@/domain/flashcards';
import { isBestTimes } from '@/domain/match';
import type { Id } from '@/domain/models';
import { SPEECH_RATE } from '@/domain/speech';
import { isNewCardsLimit, NEW_CARDS_PER_DAY } from '@/domain/studyPlan';
import { DEFAULT_TEST_OPTIONS, isTestOptions } from '@/domain/testGenerator';
import { DEFAULT_WRITE_OPTIONS, isWriteOptions } from '@/domain/writeSession';
import { db } from './db';

type Guard<T> = (value: unknown) => value is T;

/** Paramètres connus : clé de stockage, valeur par défaut et validation. */
export const SETTINGS = {
  speechRate: {
    key: 'speech.rate',
    fallback: SPEECH_RATE.default as number,
    isValid: (value: unknown): value is number => typeof value === 'number',
  },
  /** Voix choisie par langue principale (`en`, `es`…) : identifiant `voiceURI`. */
  speechVoices: {
    key: 'speech.voices',
    fallback: {} as Record<string, string>,
    isValid: (value: unknown): value is Record<string, string> =>
      typeof value === 'object' &&
      value !== null &&
      Object.values(value).every((item) => typeof item === 'string'),
  },
  flashcardOptions: {
    key: 'flashcards.options',
    fallback: DEFAULT_FLASHCARD_OPTIONS,
    isValid: isFlashcardOptions,
  },
  /** Nouvelles cartes introduites par jour, tous sets confondus. */
  newCardsPerDay: {
    key: 'srs.newCardsPerDay',
    fallback: NEW_CARDS_PER_DAY.default as number,
    isValid: isNewCardsLimit,
  },
  /** Tolérance de correction des réponses écrites (modes Écrire et Test). */
  answerTolerance: {
    key: 'answers.tolerance',
    fallback: DEFAULT_ANSWER_TOLERANCE,
    isValid: isAnswerTolerance,
  },
  writeOptions: {
    key: 'write.options',
    fallback: DEFAULT_WRITE_OPTIONS,
    isValid: isWriteOptions,
  },
  testOptions: {
    key: 'test.options',
    fallback: DEFAULT_TEST_OPTIONS,
    isValid: isTestOptions,
  },
  /** Meilleur temps du jeu Associer, en millisecondes, par set. */
  matchBestTimes: {
    key: 'match.bestTimes',
    fallback: {} as Record<Id, number>,
    isValid: isBestTimes,
  },
} as const;

/** Lit un paramètre ; retourne la valeur par défaut s'il est absent ou invalide. */
export async function getSetting<T>(key: string, fallback: T, isValid?: Guard<T>): Promise<T> {
  const entry = await db.settings.get(key);
  if (entry === undefined) return fallback;
  const valid = isValid ? isValid(entry.value) : typeof entry.value === typeof fallback;
  return valid ? (entry.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

interface SettingDefinition<T> {
  key: string;
  fallback: T;
  isValid: Guard<T>;
}

export function readSetting<T>({ key, fallback, isValid }: SettingDefinition<T>): Promise<T> {
  return getSetting(key, fallback, isValid);
}

/** Valeur réactive d'un paramètre ; `undefined` pendant le chargement. */
export function useSetting<T>(definition: SettingDefinition<T>): T | undefined {
  const { key, fallback, isValid } = definition;
  return useLiveQuery(() => getSetting(key, fallback, isValid), [key]);
}

export function saveSetting<T>(definition: SettingDefinition<T>, value: T): Promise<void> {
  return setSetting(definition.key, value);
}

/** Modifie un paramètre à partir de sa valeur actuelle, sans risque d'écriture concurrente. */
export function updateSetting<T>(
  definition: SettingDefinition<T>,
  update: (current: T) => T,
): Promise<T> {
  return db.transaction('rw', db.settings, async () => {
    const next = update(await readSetting(definition));
    await setSetting(definition.key, next);
    return next;
  });
}
