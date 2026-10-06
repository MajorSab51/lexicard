import type { CardProgress, ReviewLog, ReviewResult } from './models';
import { applyReview } from './srs';
import {
  computeStreak,
  dailyActivity,
  DEFAULT_DAILY_GOAL,
  goalProgress,
  hardestCards,
  isDailyGoal,
  reviewDay,
  successRate,
} from './stats';

/** Révision à une date et heure locales. */
function log(
  cardId: string,
  [year, month, day, hour = 12]: [number, number, number, number?],
  result: ReviewResult = 'good',
  durationMs = 4000,
): ReviewLog {
  return {
    id: `${cardId}-${String(year)}-${String(month)}-${String(day)}-${String(hour)}-${result}`,
    userId: null,
    cardId,
    setId: 'set',
    mode: 'learn',
    result,
    durationMs,
    reviewedAt: new Date(year, month - 1, day, hour).toISOString(),
  };
}

describe('activité par jour', () => {
  it('compte les cartes différentes, les réponses et le temps, jours vides compris', () => {
    const logs = [
      log('a', [2026, 10, 4, 9]),
      log('a', [2026, 10, 4, 10], 'again'),
      log('b', [2026, 10, 4, 23], 'seen', 2000),
      log('c', [2026, 10, 6, 0]),
      log('d', [2026, 9, 30]), // hors période
    ];
    expect(dailyActivity(logs, '2026-10-04', '2026-10-06')).toEqual([
      { day: '2026-10-04', cards: 2, reviews: 3, durationMs: 10_000 },
      { day: '2026-10-05', cards: 0, reviews: 0, durationMs: 0 },
      { day: '2026-10-06', cards: 1, reviews: 1, durationMs: 4000 },
    ]);
  });

  it('range une révision dans son jour local', () => {
    expect(reviewDay(log('a', [2026, 10, 5, 23]))).toBe('2026-10-05');
    expect(reviewDay(log('a', [2026, 10, 6, 0]))).toBe('2026-10-06');
  });
});

describe('série de jours', () => {
  const days = (...list: string[]) => new Set(list);

  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    expect(computeStreak(days('2026-10-04', '2026-10-05', '2026-10-06'), '2026-10-06')).toEqual({
      current: 3,
      longest: 3,
      activeToday: true,
    });
  });

  it('garde la série d’hier tant que la journée n’est pas finie', () => {
    expect(computeStreak(days('2026-10-04', '2026-10-05'), '2026-10-06')).toMatchObject({
      current: 2,
      activeToday: false,
    });
  });

  it('repart de zéro après un jour sans révision et garde le record', () => {
    const history = days('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-03');
    expect(computeStreak(history, '2026-10-06')).toEqual({
      current: 0,
      longest: 4,
      activeToday: false,
    });
  });

  it('franchit les changements de mois et d’heure', () => {
    const history = days('2026-10-24', '2026-10-25', '2026-10-26', '2026-10-31', '2026-11-01');
    expect(computeStreak(history, '2026-11-01')).toEqual({
      current: 2,
      longest: 3,
      activeToday: true,
    });
  });

  it('vaut zéro sans aucune révision', () => {
    expect(computeStreak(days(), '2026-10-06')).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
    });
  });
});

describe('taux de réussite', () => {
  it('compte toute réponse notée autre que Raté, sans les cartes consultées', () => {
    const logs = [
      log('a', [2026, 10, 6], 'good'),
      log('b', [2026, 10, 6], 'hard'),
      log('c', [2026, 10, 6], 'again'),
      log('d', [2026, 10, 6], 'easy'),
      log('e', [2026, 10, 6], 'seen'),
    ];
    expect(successRate(logs)).toEqual({ graded: 4, correct: 3, rate: 0.75 });
    expect(successRate([log('e', [2026, 10, 6], 'seen')]).rate).toBeNull();
  });
});

describe('cartes les plus difficiles', () => {
  const progress = new Map<string, CardProgress>([
    ['b', { ...applyReview(undefined, 'b', 'again', new Date()), easeFactor: 1.3 }],
    ['c', { ...applyReview(undefined, 'c', 'again', new Date()), easeFactor: 2.1 }],
  ]);

  it('classe par nombre d’échecs, part d’échecs puis facilité', () => {
    const logs = [
      ...(['again', 'again', 'good'] as const).map((r) => log('a', [2026, 10, 6], r)),
      ...(['again', 'good'] as const).map((r) => log('b', [2026, 10, 5], r)),
      ...(['again', 'good'] as const).map((r) => log('c', [2026, 10, 4], r)),
      log('d', [2026, 10, 6], 'again'),
      log('e', [2026, 10, 6], 'good'),
      log('f', [2026, 10, 6], 'seen'),
    ];
    expect(hardestCards(logs, progress).map((card) => card.cardId)).toEqual(['a', 'd', 'b', 'c']);
    expect(hardestCards(logs, progress, 2)).toEqual([
      { cardId: 'a', failures: 2, graded: 3, easeFactor: null },
      { cardId: 'd', failures: 1, graded: 1, easeFactor: null },
    ]);
  });
});

describe('objectif quotidien', () => {
  const today = { day: '2026-10-06', cards: 12, reviews: 20, durationMs: 9.5 * 60_000 };

  it('mesure l’avancement en cartes ou en minutes', () => {
    expect(goalProgress(today, DEFAULT_DAILY_GOAL)).toEqual({
      value: 12,
      target: 20,
      ratio: 0.6,
      reached: false,
    });
    expect(goalProgress(today, { kind: 'minutes', target: 5 })).toEqual({
      value: 9,
      target: 5,
      ratio: 1,
      reached: true,
    });
    expect(goalProgress(undefined, DEFAULT_DAILY_GOAL)).toMatchObject({ value: 0, ratio: 0 });
  });

  it('valide l’objectif enregistré', () => {
    expect(isDailyGoal(DEFAULT_DAILY_GOAL)).toBe(true);
    expect(isDailyGoal({ kind: 'minutes', target: 15 })).toBe(true);
    expect(isDailyGoal({ kind: 'minutes', target: 0 })).toBe(false);
    expect(isDailyGoal({ kind: 'hours', target: 1 })).toBe(false);
    expect(isDailyGoal({ kind: 'cards', target: 2.5 })).toBe(false);
  });
});
