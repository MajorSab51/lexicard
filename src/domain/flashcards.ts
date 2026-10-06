import type { Card, Id } from './models';

export interface FlashcardOptions {
  /** Affiche la traduction au recto et le terme au verso. */
  reversed: boolean;
  shuffle: boolean;
  /** Ne garde que les cartes marquées « difficile ». */
  onlyDifficult: boolean;
}

export const DEFAULT_FLASHCARD_OPTIONS: FlashcardOptions = {
  reversed: false,
  shuffle: false,
  onlyDifficult: false,
};

export function isFlashcardOptions(value: unknown): value is FlashcardOptions {
  if (typeof value !== 'object' || value === null) return false;
  const options = value as Record<string, unknown>;
  return (['reversed', 'shuffle', 'onlyDifficult'] as const).every(
    (key) => typeof options[key] === 'boolean',
  );
}

/** Mélange de Fisher-Yates ; `random` est injectable pour des tests reproductibles. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i];
    const b = result[j];
    if (a !== undefined && b !== undefined) {
      result[i] = b;
      result[j] = a;
    }
  }
  return result;
}

/**
 * Ordre de passage des cartes pour une session. On garde des identifiants (et non les cartes) :
 * l'ordre reste stable même quand une carte est modifiée pendant la session.
 */
export function buildDeck(
  cards: readonly Card[],
  options: Pick<FlashcardOptions, 'shuffle' | 'onlyDifficult'>,
  random: () => number = Math.random,
): Id[] {
  const ids = cards
    .filter((card) => !options.onlyDifficult || card.difficult)
    .map((card) => card.id);
  return options.shuffle ? shuffle(ids, random) : ids;
}

export interface CardFace {
  text: string;
  lang: string;
}

/** Recto et verso d'une carte selon le sens choisi. */
export function cardFaces(
  card: Pick<Card, 'term' | 'translation'>,
  langs: { sourceLang: string; targetLang: string },
  reversed: boolean,
): { front: CardFace; back: CardFace } {
  const term = { text: card.term, lang: langs.sourceLang };
  const translation = { text: card.translation, lang: langs.targetLang };
  return reversed ? { front: translation, back: term } : { front: term, back: translation };
}

export interface FlashcardSession {
  deck: Id[];
  index: number;
  flipped: boolean;
  finished: boolean;
}

export type FlashcardAction =
  { type: 'flip' } | { type: 'next' } | { type: 'previous' } | { type: 'start'; deck: Id[] };

export function startSession(deck: Id[]): FlashcardSession {
  return { deck, index: 0, flipped: false, finished: deck.length === 0 };
}

export function flashcardReducer(
  session: FlashcardSession,
  action: FlashcardAction,
): FlashcardSession {
  switch (action.type) {
    case 'start':
      return startSession(action.deck);
    case 'flip':
      return session.finished ? session : { ...session, flipped: !session.flipped };
    case 'next':
      if (session.finished) return session;
      if (session.index >= session.deck.length - 1) return { ...session, finished: true };
      return { ...session, index: session.index + 1, flipped: false };
    case 'previous':
      // Depuis l'écran de fin, on revient sur la dernière carte.
      if (session.finished && session.deck.length > 0) {
        return { ...session, finished: false, flipped: false };
      }
      if (session.index === 0) return session;
      return { ...session, index: session.index - 1, flipped: false };
  }
}
