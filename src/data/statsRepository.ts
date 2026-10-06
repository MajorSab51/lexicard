import { addDays, toLocalDay, type LocalDay } from '@/domain/dates';
import type { Id, ReviewLog } from '@/domain/models';
import { db } from './db';

/** Début d'un jour local, en ISO UTC (format de `reviewedAt`). */
export function dayStartIso(day: LocalDay): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toISOString();
}

/** Révisions de `from` à `to` inclus (jours locaux), éventuellement limitées à un set. */
export function getLogsBetween(from: LocalDay, to: LocalDay, setId?: Id): Promise<ReviewLog[]> {
  const start = dayStartIso(from);
  const end = dayStartIso(addDays(to, 1));
  if (setId) {
    return db.reviewLogs
      .where('setId')
      .equals(setId)
      .filter((log) => log.reviewedAt >= start && log.reviewedAt < end)
      .toArray();
  }
  return db.reviewLogs.where('reviewedAt').between(start, end, true, false).toArray();
}

/** Jours locaux où au moins une révision a eu lieu (lecture de l'index seul). */
export async function getActiveDays(): Promise<Set<LocalDay>> {
  const keys = await db.reviewLogs.orderBy('reviewedAt').keys();
  const days = new Set<LocalDay>();
  for (const key of keys) {
    if (typeof key === 'string') days.add(toLocalDay(new Date(key)));
  }
  return days;
}
