import { addDays, toLocalDay, type LocalDay } from './dates';
import type { CardProgress, CardStatus, Id, ReviewResult } from './models';

/*
 * Répétition espacée : algorithme SM-2 (P. Woźniak, SuperMemo 2, 1987), dans sa formulation
 * de référence (article « SuperMemo » de Wikipédia, section « Description of SM-2 algorithm ») :
 *
 * - la réponse reçoit une note de rappel q de 0 à 5. Les quatre boutons valent
 *   Raté = 1, Difficile = 3, Bien = 4, Facile = 5 ;
 * - si q ≥ 3 (rappel réussi) : intervalle de 1 jour, puis 6 jours, puis l'intervalle précédent
 *   multiplié par le facteur de facilité (EF), arrondi. Le nombre de répétitions augmente de 1 ;
 * - si q < 3 (oubli) : les répétitions repartent de zéro et la carte revient le lendemain ;
 * - après chaque réponse : EF ← EF + (0,1 − (5 − q) × (0,08 + (5 − q) × 0,02)), minimum 1,3.
 *   L'intervalle est calculé avec le facteur d'avant la réponse.
 *
 * La note ne change donc pas l'intervalle immédiat d'un rappel réussi : elle règle le facteur
 * de facilité, qui allonge ou raccourcit les intervalles suivants.
 *
 * Choix propres à LexiCards : une carte est « maîtrisée » quand son intervalle atteint 21 jours ;
 * comme dans SM-2, le retard d'une révision n'entre pas dans le calcul.
 */

export const GRADES = ['again', 'hard', 'good', 'easy'] as const satisfies readonly ReviewResult[];
/** Auto-évaluation après une réponse : Raté, Difficile, Bien, Facile. */
export type Grade = (typeof GRADES)[number];

export function isGrade(value: unknown): value is Grade {
  return typeof value === 'string' && (GRADES as readonly string[]).includes(value);
}

/** Note de rappel SM-2 (0 à 5) associée à chaque bouton. */
export const SM2_QUALITY: Readonly<Record<Grade, number>> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export const SRS = {
  initialEase: 2.5,
  minEase: 1.3,
  firstInterval: 1,
  secondInterval: 6,
  /** Intervalle (en jours) à partir duquel une carte est considérée comme maîtrisée. */
  masteredInterval: 21,
} as const;

/** Variables de SM-2 pour une carte. */
export type Sm2State = Pick<CardProgress, 'interval' | 'easeFactor' | 'repetitions' | 'lapses'>;

export const INITIAL_SM2_STATE: Sm2State = {
  interval: 0,
  easeFactor: SRS.initialEase,
  repetitions: 0,
  lapses: 0,
};

/**
 * Nouveau facteur de facilité. Les variations sont des multiples de 0,01 :
 * l'arrondi au centième efface seulement les erreurs de calcul en virgule flottante.
 */
export function nextEaseFactor(easeFactor: number, quality: number): number {
  const distance = 5 - quality;
  const next = easeFactor + (0.1 - distance * (0.08 + distance * 0.02));
  return Math.max(SRS.minEase, Math.round(next * 100) / 100);
}

/** Applique une réponse aux variables SM-2 (fonction pure, sans notion de date). */
export function reviewSm2(state: Sm2State, grade: Grade): Sm2State {
  const quality = SM2_QUALITY[grade];
  const easeFactor = nextEaseFactor(state.easeFactor, quality);

  if (quality < 3) {
    return {
      interval: SRS.firstInterval,
      easeFactor,
      repetitions: 0,
      // Un oubli ne compte que pour une carte qui avait déjà été retenue.
      lapses: state.lapses + (state.repetitions > 0 ? 1 : 0),
    };
  }

  let interval: number;
  if (state.repetitions === 0) interval = SRS.firstInterval;
  else if (state.repetitions === 1) interval = SRS.secondInterval;
  // Le minimum d'un jour protège d'une progression importée incohérente (intervalle nul).
  else interval = Math.max(1, Math.round(state.interval * state.easeFactor));

  return { interval, easeFactor, repetitions: state.repetitions + 1, lapses: state.lapses };
}

export function statusForInterval(interval: number): Exclude<CardStatus, 'new'> {
  return interval >= SRS.masteredInterval ? 'mastered' : 'learning';
}

/**
 * Progression d'une carte après une réponse donnée à l'instant `now`.
 * `previous` est absent pour une carte nouvelle.
 */
export function applyReview(
  previous: CardProgress | undefined,
  cardId: Id,
  grade: Grade,
  now: Date,
): CardProgress {
  const today = toLocalDay(now);
  const state = reviewSm2(previous ?? INITIAL_SM2_STATE, grade);
  return {
    cardId,
    userId: previous?.userId ?? null,
    ...state,
    dueDate: addDays(today, state.interval),
    lastReviewedAt: now.toISOString(),
    status: statusForInterval(state.interval),
    introducedOn: previous ? previous.introducedOn : today,
  };
}

/** Niveau d'une carte d'après sa progression (absente pour une carte jamais étudiée). */
export function cardStatus(progress: CardProgress | undefined): CardStatus {
  return progress ? progress.status : 'new';
}

/** Une carte déjà étudiée est due le jour prévu ou après (révision en retard). */
export function isDue(progress: CardProgress | undefined, today: LocalDay): boolean {
  return progress !== undefined && progress.dueDate <= today;
}
