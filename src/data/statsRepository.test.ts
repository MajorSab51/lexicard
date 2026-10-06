import { addDays, toLocalDay } from '@/domain/dates';
import type { ReviewLog } from '@/domain/models';
import { db } from './db';
import { dayStartIso, getActiveDays, getLogsBetween } from './statsRepository';

function log(id: string, at: Date, setId = 's1'): ReviewLog {
  return {
    id,
    userId: null,
    cardId: `card-${id}`,
    setId,
    mode: 'learn',
    result: 'good',
    durationMs: 1000,
    reviewedAt: at.toISOString(),
  };
}

describe('historique des révisions', () => {
  it('donne le début d’un jour local en ISO', () => {
    expect(dayStartIso('2026-10-06')).toBe(new Date(2026, 9, 6).toISOString());
  });

  it('lit les révisions d’une période en jours locaux, éventuellement pour un set', async () => {
    await db.reviewLogs.bulkAdd([
      log('before', new Date(2026, 9, 3, 23, 59)),
      log('first', new Date(2026, 9, 4, 0, 0)),
      log('other-set', new Date(2026, 9, 5, 12), 's2'),
      log('last', new Date(2026, 9, 6, 23, 59)),
      log('after', new Date(2026, 9, 7, 0, 0)),
    ]);
    const ids = (logs: ReviewLog[]) => logs.map((entry) => entry.id).sort();
    expect(ids(await getLogsBetween('2026-10-04', '2026-10-06'))).toEqual([
      'first',
      'last',
      'other-set',
    ]);
    expect(ids(await getLogsBetween('2026-10-04', '2026-10-06', 's1'))).toEqual(['first', 'last']);
  });

  it('liste les jours actifs', async () => {
    const today = toLocalDay(new Date());
    const noon = (offset: number) => {
      const [y = 0, m = 1, d = 1] = addDays(today, offset).split('-').map(Number);
      return new Date(y, m - 1, d, 12);
    };
    await db.reviewLogs.bulkAdd([log('a', noon(0)), log('b', noon(0)), log('c', noon(-2))]);
    expect([...(await getActiveDays())].sort()).toEqual([addDays(today, -2), today]);
  });
});
