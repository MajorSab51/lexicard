import { CalendarCheck, PartyPopper } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useNextDue } from '@/data/hooks';
import type { StudyScope } from '@/data/progressRepository';
import { daysBetween, type LocalDay } from '@/domain/dates';
import { studiedCount, type LearnSession } from '@/domain/learnSession';
import type { Id } from '@/domain/models';
import { GRADES } from '@/domain/srs';
import { earliestDueDate, newCardAllowance } from '@/domain/studyPlan';
import { formatNumber, formatRelativeDays, t, tn } from '@/i18n';

function NextReview({ today, nextDue }: { today: LocalDay; nextDue: LocalDay | null | undefined }) {
  if (!nextDue) return null;
  const when = formatRelativeDays(Math.max(0, daysBetween(today, nextDue)));
  return <p className="mt-3 text-fg-muted">{t('srs.nextReview', { when })}</p>;
}

function ExitActions({ setId }: { setId: Id | null }) {
  if (!setId) return <ButtonLink to="/">{t('learn.backHome')}</ButtonLink>;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <ButtonLink to={`/sets/${setId}`}>{t('study.backToSet')}</ButtonLink>
      <ButtonLink variant="secondary" to={`/sets/${setId}/flashcards`}>
        {t('learn.practice')}
      </ButtonLink>
    </div>
  );
}

/** Aucune carte due et aucune nouvelle carte disponible aujourd'hui. */
export function NothingToReview({ scope, setId }: { scope: StudyScope; setId: Id | null }) {
  const cardIds = scope.cards.map((card) => card.id);
  const newInScope = cardIds.filter((id) => !scope.progress.has(id)).length;
  const limitReached =
    newInScope > 0 && newCardAllowance(scope.newLimit, scope.introducedToday) === 0;

  return (
    <EmptyState
      icon={CalendarCheck}
      title={t('learn.nothingTitle')}
      body={t('learn.nothingBody')}
      action={<ExitActions setId={setId} />}
    >
      <NextReview today={scope.today} nextDue={earliestDueDate(cardIds, scope.progress)} />
      {limitReached && (
        <p className="mt-3 max-w-sm text-fg-muted">
          {tn('srs.limitReached', scope.newLimit)}{' '}
          <Link to="/settings" className="font-medium text-primary underline">
            {t('srs.changeLimit')}
          </Link>
        </p>
      )}
    </EmptyState>
  );
}

interface SessionSummaryProps {
  session: LearnSession;
  setId: Id | null;
  /** Jour de la session. */
  today: LocalDay;
}

/** Bilan de fin de session : réponses par note et prochaine révision. */
export function SessionSummary({ session, setId, today }: SessionSummaryProps) {
  const nextDue = useNextDue(setId);

  return (
    <EmptyState
      icon={PartyPopper}
      title={t('learn.finishedTitle')}
      body={tn('learn.finishedBody', studiedCount(session))}
      action={<ExitActions setId={setId} />}
    >
      <dl aria-label={t('learn.results')} className="mt-5 grid w-full max-w-md grid-cols-4 gap-2">
        {GRADES.map((grade) => (
          <div key={grade} className="rounded-xl bg-surface-muted px-2 py-2">
            <dt className="text-sm text-fg-muted">{t(`learn.grades.${grade}`)}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {formatNumber(session.tally[grade])}
            </dd>
          </div>
        ))}
      </dl>
      <NextReview today={today} nextDue={nextDue} />
    </EmptyState>
  );
}
