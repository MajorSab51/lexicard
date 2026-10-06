import type { AnswerVerdict } from './answers';
import type { LocalDay } from './dates';
import type { CardProgress, Id } from './models';
import { isDue, type Grade } from './srs';

/*
 * Session du mode Écrire : on saisit la réponse, on voit la correction, puis on continue.
 * Une carte ratée revient en fin de session jusqu'à être retrouvée ; seule la première
 * tentative compte pour le score et pour la répétition espacée.
 */

export interface WriteOptions {
  /** Afficher la traduction et écrire le terme (sinon : afficher le terme, écrire la traduction). */
  reversed: boolean;
}

export const DEFAULT_WRITE_OPTIONS: WriteOptions = { reversed: false };

export function isWriteOptions(value: unknown): value is WriteOptions {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).reversed === 'boolean'
  );
}

/** Note de répétition espacée d'une réponse écrite : « presque correct » vaut Difficile. */
export const VERDICT_GRADE: Readonly<Record<AnswerVerdict, Grade>> = {
  correct: 'good',
  almost: 'hard',
  wrong: 'again',
};

/**
 * Une réponse écrite replanifie une carte nouvelle ou due. Pour une carte prévue plus tard,
 * seul un oubli la replanifie : réussir en avance ne doit pas repousser la révision.
 */
export function writeUpdatesSchedule(
  progress: CardProgress | undefined,
  today: LocalDay,
  grade: Grade,
): boolean {
  return progress === undefined || isDue(progress, today) || grade === 'again';
}

export interface WriteItem {
  cardId: Id;
  /** Nouvel essai d'une carte ratée plus tôt dans la session. */
  retry: boolean;
}

export interface WriteResult {
  cardId: Id;
  verdict: AnswerVerdict;
  given: string;
}

export interface WriteSession {
  queue: readonly WriteItem[];
  /** Correction affichée pour la carte en cours, jusqu'à ce qu'on continue. */
  feedback: { given: string; verdict: AnswerVerdict } | null;
  /** Première tentative de chaque carte, dans l'ordre. */
  results: readonly WriteResult[];
}

export type WriteAction =
  { type: 'submit'; given: string; verdict: AnswerVerdict } | { type: 'continue' };

export function startWriteSession(cardIds: readonly Id[]): WriteSession {
  return {
    queue: cardIds.map((cardId) => ({ cardId, retry: false })),
    feedback: null,
    results: [],
  };
}

export function writeReducer(session: WriteSession, action: WriteAction): WriteSession {
  const [current, ...rest] = session.queue;
  if (!current) return session;

  switch (action.type) {
    case 'submit': {
      if (session.feedback) return session;
      const { given, verdict } = action;
      return {
        ...session,
        feedback: { given, verdict },
        results: current.retry
          ? session.results
          : [...session.results, { cardId: current.cardId, verdict, given }],
      };
    }
    case 'continue': {
      if (!session.feedback) return session;
      const queue =
        session.feedback.verdict === 'wrong'
          ? [...rest, { cardId: current.cardId, retry: true }]
          : rest;
      return { ...session, queue, feedback: null };
    }
  }
}

export function countVerdicts(results: readonly WriteResult[]): Record<AnswerVerdict, number> {
  const counts: Record<AnswerVerdict, number> = { correct: 0, almost: 0, wrong: 0 };
  for (const result of results) counts[result.verdict] += 1;
  return counts;
}
