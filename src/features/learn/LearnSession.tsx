import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { recordAnswer, type StudyScope } from '@/data/progressRepository';
import {
  currentItem,
  isFinished,
  learnReducer,
  remainingByKind,
  startLearnSession,
  updatesSchedule,
} from '@/domain/learnSession';
import type { Id } from '@/domain/models';
import { GRADES, type Grade } from '@/domain/srs';
import { newCardAllowance, planDailySession } from '@/domain/studyPlan';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { t } from '@/i18n';
import { toast } from '@/lib/toast';
import { LearnCard } from './LearnCard';
import { NothingToReview, SessionSummary } from './LearnSummary';

interface LearnSessionProps {
  /** Instantané chargé au début de la session. */
  scope: StudyScope;
  /** Set étudié, ou `null` pour « Tout réviser ». */
  setId: Id | null;
}

/** Temps écoulé depuis un instant donné (hors rendu : appelé seulement par les gestionnaires). */
function elapsedSince(start: number): number {
  return Date.now() - start;
}

const KIND_ORDER = ['review', 'new', 'relearn'] as const;

const GRADE_COLORS: Record<Grade, string> = {
  again: 'text-danger',
  hard: 'text-warning',
  good: 'text-primary',
  easy: 'text-success',
};

export function LearnSession({ scope, setId }: LearnSessionProps) {
  const [session, dispatch] = useReducer(learnReducer, scope, (initial) =>
    startLearnSession(
      planDailySession({
        cardIds: initial.cards.map((card) => card.id),
        progress: initial.progress,
        today: initial.today,
        newAllowance: newCardAllowance(initial.newLimit, initial.introducedToday),
      }),
    ),
  );
  const [plannedCount] = useState(session.queue.length);
  const cardsById = useMemo(() => new Map(scope.cards.map((card) => [card.id, card])), [scope]);

  const item = currentItem(session);
  const card = item ? cardsById.get(item.cardId) : undefined;
  const set = card ? scope.sets.get(card.setId) : undefined;
  const finished = isFinished(session);

  // Temps de réponse : mesuré depuis l'affichage de la carte (chaque passage est un nouvel élément).
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [item]);

  const revealButton = useRef<HTMLButtonElement>(null);
  const gradeGroup = useRef<HTMLDivElement>(null);

  const reveal = () => {
    if (!item || session.revealed) return;
    flushSync(() => {
      dispatch({ type: 'reveal' });
    });
    gradeGroup.current?.focus();
  };

  const answer = (grade: Grade) => {
    if (!item || !session.revealed) return;
    void recordAnswer({
      cardId: item.cardId,
      grade,
      mode: 'learn',
      durationMs: elapsedSince(shownAt.current),
      updateSchedule: updatesSchedule(item),
    }).catch(() => {
      toast(t('study.saveError'), 'error');
    });
    flushSync(() => {
      dispatch({ type: 'answer', grade });
    });
    // En fin de session, le focus revient au contenu principal plutôt que de se perdre.
    (revealButton.current ?? document.getElementById('main'))?.focus();
  };

  useKeyboardShortcuts(
    {
      ' ': reveal,
      Enter: reveal,
      '1': () => {
        answer('again');
      },
      '2': () => {
        answer('hard');
      },
      '3': () => {
        answer('good');
      },
      '4': () => {
        answer('easy');
      },
    },
    !finished,
  );

  if (plannedCount === 0) return <NothingToReview scope={scope} setId={setId} />;
  if (finished || !item || !card || !set)
    return <SessionSummary session={session} setId={setId} today={scope.today} />;

  const remaining = remainingByKind(session);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ul aria-label={t('learn.remaining')} className="flex flex-wrap justify-center gap-2">
        {KIND_ORDER.map((kind) => (
          <li
            key={kind}
            aria-current={item.kind === kind ? 'true' : undefined}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              item.kind === kind
                ? 'border-primary bg-primary-soft font-semibold text-on-primary-soft'
                : 'border-border bg-surface text-fg-muted'
            }`}
          >
            {t(`learn.kinds.${kind}`)}
            <span className="font-semibold tabular-nums">{remaining[kind]}</span>
          </li>
        ))}
      </ul>

      <LearnCard
        key={item.cardId}
        card={card}
        set={set}
        kind={item.kind}
        revealed={session.revealed}
        showSetTitle={setId === null}
      />
      {/* Région persistante : elle annonce chaque carte puis sa réponse aux lecteurs d'écran. */}
      <p aria-live="polite" className="sr-only">
        {session.revealed
          ? t('learn.announceAnswer', { text: card.translation })
          : t('learn.announceTerm', { text: card.term })}
      </p>

      {session.revealed ? (
        <div
          ref={gradeGroup}
          role="group"
          aria-label={t('learn.gradeGroup')}
          tabIndex={-1}
          className="grid grid-cols-4 gap-2 rounded-xl"
        >
          {GRADES.map((grade, index) => (
            <button
              key={grade}
              type="button"
              onClick={() => {
                answer(grade);
              }}
              className={`flex h-16 flex-col items-center justify-center rounded-xl border border-border bg-surface px-1 text-sm font-semibold transition-colors hover:bg-surface-muted sm:text-base ${GRADE_COLORS[grade]}`}
            >
              {t(`learn.grades.${grade}`)}
              <kbd
                aria-hidden="true"
                className="font-sans text-xs font-normal text-fg-muted pointer-coarse:hidden"
              >
                {index + 1}
              </kbd>
            </button>
          ))}
        </div>
      ) : (
        <button
          ref={revealButton}
          type="button"
          onClick={reveal}
          className="h-16 w-full rounded-xl bg-primary text-lg font-semibold text-on-primary transition-colors select-none hover:bg-primary-hover"
        >
          {t('learn.showAnswer')}
        </button>
      )}

      <p className="text-center text-sm text-fg-muted">
        <span className="pointer-coarse:hidden">{t('learn.keyboardHint')}</span>
        <span className="hidden pointer-coarse:inline">{t('learn.touchHint')}</span>
      </p>
    </div>
  );
}
