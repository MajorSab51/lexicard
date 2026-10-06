import type { ReviewLog } from '@/domain/models';
import { createId, nowIso } from '@/lib/id';
import { db } from './db';

export type ReviewInput = Pick<ReviewLog, 'cardId' | 'setId' | 'mode' | 'result' | 'durationMs'>;

function buildLog(input: ReviewInput, reviewedAt: string): ReviewLog {
  return {
    id: createId(),
    userId: null,
    ...input,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    reviewedAt,
  };
}

/** Ajoute une révision à l'historique (statistiques, série de jours). */
export async function logReview(input: ReviewInput, reviewedAt = nowIso()): Promise<ReviewLog> {
  const log = buildLog(input, reviewedAt);
  await db.reviewLogs.add(log);
  return log;
}

/** Ajoute plusieurs révisions d'un coup (fin d'un test ou d'une partie). */
export async function logReviews(inputs: readonly ReviewInput[], reviewedAt = nowIso()) {
  await db.reviewLogs.bulkAdd(inputs.map((input) => buildLog(input, reviewedAt)));
}
