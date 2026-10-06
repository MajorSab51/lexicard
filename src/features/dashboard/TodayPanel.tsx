import { Brain } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { StatTiles } from '@/components/StatTiles';
import { useDailyOverview } from '@/data/hooks';
import { daysBetween } from '@/domain/dates';
import { formatRelativeDays, t, tn } from '@/i18n';

/** Révision du jour, tous sets confondus : compteurs et accès à « Tout réviser ». */
export function TodayPanel() {
  const overview = useDailyOverview();
  if (!overview) return null;

  const { today, counts, newToday, newLimit, nextDue } = overview;
  const hasWork = counts.due + newToday > 0;
  const limitReached = !hasWork && counts.new > 0 && newToday === 0;

  let message = t('dashboard.todayReady');
  if (counts.total === 0) message = t('dashboard.todayNoCards');
  else if (!hasWork) message = t('dashboard.todayDone');

  return (
    <section
      aria-labelledby="today-title"
      className="mb-8 rounded-2xl border border-border bg-surface p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id="today-title" className="text-lg font-semibold">
            {t('dashboard.todayTitle')}
          </h2>
          <p className="mt-1 text-fg-muted">
            {message}
            {!hasWork && nextDue && (
              <>
                {' '}
                {t('srs.nextReview', {
                  when: formatRelativeDays(Math.max(0, daysBetween(today, nextDue))),
                })}
              </>
            )}
          </p>
          {limitReached && (
            <p className="mt-1 text-fg-muted">
              {tn('srs.limitReached', newLimit)}{' '}
              <Link to="/settings" className="font-medium text-primary underline">
                {t('srs.changeLimit')}
              </Link>
            </p>
          )}
        </div>
        {hasWork && (
          <ButtonLink to="/learn" size="lg">
            <Brain aria-hidden="true" className="size-5" />
            {t('dashboard.reviewAll')}
          </ButtonLink>
        )}
      </div>
      <StatTiles
        items={[
          { label: t('srs.dueToday'), value: counts.due, tone: 'primary' },
          { label: t('srs.newToday'), value: newToday },
          { label: t('srs.mastered'), value: counts.mastered, tone: 'success' },
        ]}
      />
    </section>
  );
}
