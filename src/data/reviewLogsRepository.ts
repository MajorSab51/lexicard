import type { ReviewLog } from '@/domain/models';
import { createId, nowIso } from '@/lib/id';
import { db } from './db';

export type ReviewInput = Pick<ReviewLog, 'cardId' | 'setId' | 'mode' | 'result' | 'durationMs'>;

/** Ajoute une révision à l'historique (statistiques, série de jours). */
export async function logReview(input: ReviewInput, reviewedAt = nowIso()): Promise<ReviewLog> {
  const log: ReviewLog = {
    id: createId(),
    userId: null,
    ...input,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    reviewedAt,
  };
  await db.reviewLogs.add(log);
  return log;
}
