import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_FLASHCARD_OPTIONS, isFlashcardOptions } from '@/domain/flashcards';
import { SPEECH_RATE } from '@/domain/speech';
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

/** Valeur réactive d'un paramètre ; `undefined` pendant le chargement. */
export function useSetting<T>(definition: SettingDefinition<T>): T | undefined {
  const { key, fallback, isValid } = definition;
  return useLiveQuery(() => getSetting(key, fallback, isValid), [key]);
}

export function saveSetting<T>(definition: SettingDefinition<T>, value: T): Promise<void> {
  return setSetting(definition.key, value);
}
