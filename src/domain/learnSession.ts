import type { Id } from './models';
import { GRADES, type Grade } from './srs';
import type { DailyPlan } from './studyPlan';

/**
 * File d'une session du mode Apprendre.
 * Une carte ratée repasse en fin de session (« à revoir ») jusqu'à être retrouvée :
 * c'est l'étape 6 de SM-2. Seule la première réponse du jour modifie la planification.
 */

export type LearnItemKind = 'review' | 'new' | 'relearn';

export interface LearnItem {
  cardId: Id;
  kind: LearnItemKind;
}

export interface LearnSession {
  /** Cartes restantes ; la première est la carte affichée. */
  queue: readonly LearnItem[];
  /** La réponse de la carte affichée est visible. */
  revealed: boolean;
  /** Première réponse de chaque carte, par note. */
  tally: Readonly<Record<Grade, number>>;
}

export type LearnAction = { type: 'reveal' } | { type: 'answer'; grade: Grade } | { type: 'skip' };

const emptyTally = (): Record<Grade, number> =>
  Object.fromEntries(GRADES.map((grade) => [grade, 0])) as Record<Grade, number>;

export function startLearnSession(plan: DailyPlan): LearnSession {
  return {
    queue: [
      ...plan.reviewIds.map((cardId): LearnItem => ({ cardId, kind: 'review' })),
      ...plan.newIds.map((cardId): LearnItem => ({ cardId, kind: 'new' })),
    ],
    revealed: false,
    tally: emptyTally(),
  };
}

/** La réponse à cette carte doit-elle mettre à jour sa planification ? */
export function updatesSchedule(item: LearnItem): boolean {
  return item.kind !== 'relearn';
}

export function learnReducer(session: LearnSession, action: LearnAction): LearnSession {
  const [current, ...rest] = session.queue;
  if (!current) return session;

  switch (action.type) {
    case 'reveal':
      return session.revealed ? session : { ...session, revealed: true };
    case 'skip':
      return { ...session, queue: rest, revealed: false };
    case 'answer': {
      // On ne note qu'une réponse affichée.
      if (!session.revealed) return session;
      const queue =
        action.grade === 'again'
          ? [...rest, { cardId: current.cardId, kind: 'relearn' } as const]
          : rest;
      const tally = updatesSchedule(current)
        ? { ...session.tally, [action.grade]: session.tally[action.grade] + 1 }
        : session.tally;
      return { queue, revealed: false, tally };
    }
  }
}

export function currentItem(session: LearnSession): LearnItem | undefined {
  return session.queue[0];
}

export function isFinished(session: LearnSession): boolean {
  return session.queue.length === 0;
}

/** Cartes restantes par catégorie, pour les compteurs de la session. */
export function remainingByKind(session: LearnSession): Record<LearnItemKind, number> {
  const counts: Record<LearnItemKind, number> = { review: 0, new: 0, relearn: 0 };
  for (const item of session.queue) counts[item.kind] += 1;
  return counts;
}

/** Nombre de cartes différentes déjà notées dans la session. */
export function studiedCount(session: LearnSession): number {
  return GRADES.reduce((sum, grade) => sum + session.tally[grade], 0);
}
