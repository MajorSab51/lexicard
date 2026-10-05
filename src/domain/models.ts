/**
 * Modèle de données de LexiCards.
 * Les identifiants sont des UUID ; les horodatages sont des chaînes ISO 8601 en UTC.
 * `userId` est toujours `null` dans le MVP : il prépare l'arrivée des comptes (version 2).
 */

export type Id = string;
export type IsoDateTime = string;

export const SET_COLORS = [
  'teal',
  'blue',
  'violet',
  'pink',
  'red',
  'orange',
  'amber',
  'green',
  'slate',
] as const;
export type SetColor = (typeof SET_COLORS)[number];

export interface StudySet {
  id: Id;
  userId: Id | null;
  title: string;
  description: string;
  /** Langue des termes, c'est-à-dire la langue apprise (code BCP 47, ex. `en`). */
  sourceLang: string;
  /** Langue des traductions (code BCP 47, ex. `fr`). */
  targetLang: string;
  color: SetColor;
  tags: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'expression',
  'other',
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export const GENDERS = ['masculine', 'feminine', 'neuter'] as const;
export type Gender = (typeof GENDERS)[number];

export interface Card {
  id: Id;
  userId: Id | null;
  setId: Id;
  term: string;
  translation: string;
  /** Champs optionnels : chaîne vide quand ils ne sont pas renseignés. */
  example: string;
  note: string;
  imageUrl: string;
  partOfSpeech: PartOfSpeech | '';
  gender: Gender | '';
  /** Position dans le set (0, 1, 2…). */
  order: number;
  favorite: boolean;
  difficult: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Contenu éditable d'une carte, sans les champs techniques. */
export type CardContent = Pick<
  Card,
  'term' | 'translation' | 'example' | 'note' | 'imageUrl' | 'partOfSpeech' | 'gender'
>;

export type CardStatus = 'new' | 'learning' | 'mastered';

/** État de répétition espacée d'une carte (utilisé à partir du jalon 3). */
export interface CardProgress {
  cardId: Id;
  userId: Id | null;
  interval: number;
  easeFactor: number;
  repetitions: number;
  /** Jour de la prochaine révision, au format local `AAAA-MM-JJ`. */
  dueDate: string;
  lastReviewedAt: IsoDateTime | null;
  lapses: number;
  status: CardStatus;
}

export type StudyMode = 'flashcards' | 'learn' | 'write' | 'test' | 'match';
export type ReviewResult = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewLog {
  id: Id;
  userId: Id | null;
  cardId: Id;
  /** Conservé pour les statistiques par set, même après suppression de la carte. */
  setId: Id;
  mode: StudyMode;
  result: ReviewResult;
  durationMs: number;
  reviewedAt: IsoDateTime;
}

export interface Setting {
  key: string;
  value: unknown;
}

export function emptyCardContent(): CardContent {
  return {
    term: '',
    translation: '',
    example: '',
    note: '',
    imageUrl: '',
    partOfSpeech: '',
    gender: '',
  };
}
