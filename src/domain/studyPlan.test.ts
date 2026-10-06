import { seeded } from '@/test/random';
import type { CardProgress } from './models';
import { applyReview } from './srs';
import {
  countSrs,
  earliestDueDate,
  isNewCardsLimit,
  newCardAllowance,
  planDailySession,
} from './studyPlan';

const TODAY = '2026-10-06';

/** Progression d'une carte prévue le jour indiqué, avec l'intervalle voulu. */
function progressDue(cardId: string, dueDate: string, interval = 6): CardProgress {
  return {
    ...applyReview(undefined, cardId, 'good', new Date(2026, 8, 1)),
    dueDate,
    interval,
    status: interval >= 21 ? 'mastered' : 'learning',
  };
}

const progress = new Map<string, CardProgress>([
  ['late', progressDue('late', '2026-10-01')],
  ['today', progressDue('today', TODAY, 30)],
  ['later', progressDue('later', '2026-10-20', 25)],
  ['tomorrow', progressDue('tomorrow', '2026-10-07')],
]);
const cardIds = ['n1', 'late', 'n2', 'today', 'later', 'n3', 'tomorrow', 'n4'];

describe('session du jour', () => {
  it('prend toutes les cartes dues, y compris en retard, et les nouvelles dans l’ordre', () => {
    const plan = planDailySession({ cardIds, progress, today: TODAY, newAllowance: 10 });
    expect([...plan.reviewIds].sort()).toEqual(['late', 'today']);
    expect(plan.newIds).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('limite les nouvelles cartes à l’allocation restante du jour', () => {
    expect(planDailySession({ cardIds, progress, today: TODAY, newAllowance: 2 }).newIds).toEqual([
      'n1',
      'n2',
    ]);
    expect(planDailySession({ cardIds, progress, today: TODAY, newAllowance: 0 }).newIds).toEqual(
      [],
    );
  });

  it('mélange les révisions de façon reproductible', () => {
    const many = Array.from({ length: 8 }, (_, i) => `c${String(i)}`);
    const due = new Map(many.map((id) => [id, progressDue(id, TODAY)]));
    const plan = planDailySession({
      cardIds: many,
      progress: due,
      today: TODAY,
      newAllowance: 0,
      random: seeded(3),
    });
    expect(plan.reviewIds).not.toEqual(many);
    expect([...plan.reviewIds].sort()).toEqual([...many].sort());
  });

  it('calcule l’allocation de nouvelles cartes à partir de la limite globale', () => {
    expect(newCardAllowance(10, 0)).toBe(10);
    expect(newCardAllowance(10, 7)).toBe(3);
    expect(newCardAllowance(10, 14)).toBe(0);
  });

  it('valide la limite paramétrable', () => {
    expect(isNewCardsLimit(10)).toBe(true);
    expect(isNewCardsLimit(0)).toBe(true);
    expect(isNewCardsLimit(2.5)).toBe(false);
    expect(isNewCardsLimit(-1)).toBe(false);
    expect(isNewCardsLimit(1000)).toBe(false);
    expect(isNewCardsLimit('10')).toBe(false);
  });
});

describe('compteurs', () => {
  it('compte les cartes à réviser et la répartition par niveau', () => {
    expect(countSrs(cardIds, progress, TODAY)).toEqual({
      total: 8,
      due: 2,
      new: 4,
      learning: 2,
      mastered: 2,
    });
  });

  it('donne la prochaine date de révision', () => {
    expect(earliestDueDate(['n1', 'later', 'tomorrow'], progress)).toBe('2026-10-07');
    expect(earliestDueDate(['n1', 'n2'], progress)).toBeNull();
  });
});
