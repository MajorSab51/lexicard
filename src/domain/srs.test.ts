import { addDays, daysBetween, toLocalDay } from './dates';
import type { CardProgress } from './models';
import {
  applyReview,
  cardStatus,
  GRADES,
  INITIAL_SM2_STATE,
  isDue,
  nextEaseFactor,
  reviewSm2,
  SRS,
  type Grade,
  type Sm2State,
} from './srs';

const NOW = new Date(2026, 9, 6, 10, 30);
const TODAY = toLocalDay(NOW);

/** Enchaîne des réponses données chacune le jour où la carte est due. */
function replay(grades: Grade[]): CardProgress[] {
  const history: CardProgress[] = [];
  let progress: CardProgress | undefined;
  let now = NOW;
  for (const grade of grades) {
    progress = applyReview(progress, 'card', grade, now);
    history.push(progress);
    const [year, month, day] = progress.dueDate.split('-').map(Number);
    now = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 10, 30);
  }
  return history;
}

const intervals = (history: CardProgress[]) => history.map((entry) => entry.interval);
const eases = (history: CardProgress[]) => history.map((entry) => entry.easeFactor);

describe('facteur de facilité (formule SM-2)', () => {
  it('suit EF + (0,1 − (5 − q) × (0,08 + (5 − q) × 0,02))', () => {
    expect(nextEaseFactor(2.5, 5)).toBe(2.6);
    expect(nextEaseFactor(2.5, 4)).toBe(2.5);
    expect(nextEaseFactor(2.5, 3)).toBe(2.36);
    expect(nextEaseFactor(2.5, 1)).toBe(1.96);
  });

  it('ne descend jamais sous 1,3', () => {
    expect(nextEaseFactor(1.4, 1)).toBe(SRS.minEase);
    expect(nextEaseFactor(1.3, 3)).toBe(SRS.minEase);
  });
});

describe('intervalles SM-2', () => {
  it('donne 1 jour, puis 6 jours, puis l’intervalle précédent × EF', () => {
    const history = replay(['good', 'good', 'good', 'good']);
    expect(intervals(history)).toEqual([1, 6, 15, 38]); // 15 × 2,5 = 37,5 arrondi à 38
    expect(eases(history)).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(history.map((entry) => entry.repetitions)).toEqual([1, 2, 3, 4]);
  });

  it('raccourcit les intervalles suivants quand la carte est jugée difficile', () => {
    const history = replay(['hard', 'hard', 'hard', 'hard']);
    expect(eases(history)).toEqual([2.36, 2.22, 2.08, 1.94]);
    // L'intervalle utilise le facteur d'avant la réponse : 6 × 2,22 = 13,3 ; 13 × 2,08 = 27,0.
    expect(intervals(history)).toEqual([1, 6, 13, 27]);
  });

  it('allonge les intervalles suivants quand la carte est jugée facile', () => {
    const history = replay(['easy', 'easy', 'easy', 'easy']);
    expect(eases(history)).toEqual([2.6, 2.7, 2.8, 2.9]);
    expect(intervals(history)).toEqual([1, 6, 16, 45]); // 6 × 2,7 = 16,2 ; 16 × 2,8 = 44,8
  });

  it('remet les répétitions à zéro après un oubli et compte un oubli', () => {
    const history = replay(['good', 'good', 'good', 'again', 'good', 'good', 'good']);
    expect(intervals(history)).toEqual([1, 6, 15, 1, 1, 6, 12]); // 6 × 1,96 = 11,8
    expect(history[3]).toMatchObject({ repetitions: 0, easeFactor: 1.96, lapses: 1 });
    expect(history.at(-1)).toMatchObject({ repetitions: 3, lapses: 1 });
  });

  it('ne compte pas d’oubli pour une carte jamais retenue', () => {
    const history = replay(['again', 'again', 'again', 'again']);
    expect(history.map((entry) => entry.lapses)).toEqual([0, 0, 0, 0]);
    expect(eases(history)).toEqual([1.96, 1.42, 1.3, 1.3]);
    expect(intervals(history)).toEqual([1, 1, 1, 1]);
  });

  it('protège d’un intervalle nul importé', () => {
    const corrupted: Sm2State = { interval: 0, easeFactor: 2.5, repetitions: 4, lapses: 0 };
    expect(reviewSm2(corrupted, 'good').interval).toBe(1);
  });

  it('ne modifie pas l’état reçu', () => {
    const state = { ...INITIAL_SM2_STATE };
    reviewSm2(state, 'easy');
    expect(state).toEqual(INITIAL_SM2_STATE);
  });
});

describe('une carte ratée revient plus tôt qu’une carte réussie', () => {
  const paths: Grade[][] = [['good'], ['good', 'good'], ['easy', 'easy', 'easy'], ['hard', 'good']];

  it.each(paths)('après le parcours %j', (...grades) => {
    const previous = replay(grades).at(-1);
    const failed = applyReview(previous, 'card', 'again', NOW);
    for (const grade of ['hard', 'good', 'easy'] as const) {
      const passed = applyReview(previous, 'card', grade, NOW);
      expect(failed.dueDate < passed.dueDate).toBe(true);
    }
    expect(failed.dueDate).toBe(addDays(TODAY, 1));
  });

  it('pour une carte nouvelle, Raté et Bien donnent demain ; seul le parcours suivant diffère', () => {
    const failed = applyReview(undefined, 'card', 'again', NOW);
    const passed = applyReview(undefined, 'card', 'good', NOW);
    expect(failed.dueDate).toBe(passed.dueDate);
    // Au rappel suivant réussi, la carte ratée repart à 1 jour, la carte réussie passe à 6 jours.
    const tomorrow = new Date(2026, 9, 7, 10, 30);
    expect(applyReview(failed, 'card', 'good', tomorrow).interval).toBe(1);
    expect(applyReview(passed, 'card', 'good', tomorrow).interval).toBe(6);
  });
});

describe('progression enregistrée', () => {
  it('crée la progression d’une carte nouvelle', () => {
    expect(applyReview(undefined, 'c1', 'good', NOW)).toEqual({
      cardId: 'c1',
      userId: null,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      lapses: 0,
      dueDate: '2026-10-07',
      lastReviewedAt: NOW.toISOString(),
      status: 'learning',
      introducedOn: '2026-10-06',
    });
  });

  it('garde le jour d’introduction et calcule la date due depuis le jour de révision', () => {
    const first = applyReview(undefined, 'c1', 'good', NOW);
    const later = new Date(2026, 9, 9, 8, 0); // révisée avec deux jours de retard
    const second = applyReview(first, 'c1', 'good', later);
    expect(second.introducedOn).toBe('2026-10-06');
    expect(second.dueDate).toBe('2026-10-15');
    expect(daysBetween(toLocalDay(later), second.dueDate)).toBe(second.interval);
  });

  it('marque une carte maîtrisée à partir de 21 jours d’intervalle', () => {
    const history = replay(['good', 'good', 'good', 'good', 'again']);
    expect(history.map((entry) => entry.status)).toEqual([
      'learning',
      'learning',
      'learning',
      'mastered',
      'learning',
    ]);
  });

  it('distingue cartes nouvelles et dues', () => {
    const progress = applyReview(undefined, 'c1', 'good', NOW);
    expect(cardStatus(undefined)).toBe('new');
    expect(cardStatus(progress)).toBe('learning');
    expect(isDue(undefined, TODAY)).toBe(false);
    expect(isDue(progress, TODAY)).toBe(false);
    expect(isDue(progress, '2026-10-07')).toBe(true);
    expect(isDue(progress, '2026-10-20')).toBe(true);
  });

  it('accepte les quatre notes', () => {
    expect(GRADES).toEqual(['again', 'hard', 'good', 'easy']);
  });
});
