import { ChartColumn } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GoalMeter } from '@/components/GoalMeter';
import { LevelBar } from '@/components/LevelBar';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { StatTiles } from '@/components/StatTiles';
import { useSets } from '@/data/hooks';
import { useSetsProgress, useStatsOverview, type StatsOverview } from '@/data/statsHooks';
import { emptyCounts, type SrsCounts } from '@/domain/studyPlan';
import { formatPercent, t, tn } from '@/i18n';
import { DailyChart } from './DailyChart';
import { SetsProgressList } from './SetsProgressList';

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

function streakDetail({ streak }: StatsOverview): string {
  const record = t('stats.streakRecord', { record: tn('stats.streakDays', streak.longest) });
  if (streak.activeToday) return `${t('stats.streakDone')} ${record}`;
  return `${streak.current > 0 ? t('stats.streakKeep') : t('stats.streakStart')} ${record}`;
}

function sumCounts(progress: ReadonlyMap<string, SrsCounts>): SrsCounts {
  const total = emptyCounts();
  for (const counts of progress.values()) {
    for (const key of Object.keys(total) as (keyof SrsCounts)[]) total[key] += counts[key];
  }
  return total;
}

/** Tableau de bord de progression : série, objectif, activité, réussite et niveaux. */
export function StatsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const overview = useStatsOverview(period);
  const progress = useSetsProgress();
  const sets = useSets();

  if (!overview || !progress || !sets) return <Loading />;
  if (sets.length === 0) {
    return (
      <>
        <PageHeader title={t('stats.title')} />
        <EmptyState
          icon={ChartColumn}
          title={t('stats.emptyTitle')}
          body={t('stats.emptyBody')}
          action={<ButtonLink to="/sets/new">{t('dashboard.createSet')}</ButtonLink>}
        />
      </>
    );
  }

  const { streak, goal, success, activity } = overview;
  const studied = activity.reduce((sum, day) => sum + day.cards, 0);
  const minutes = Math.round(activity.reduce((sum, day) => sum + day.durationMs, 0) / 60_000);
  const totals = sumCounts(progress);

  return (
    <>
      <PageHeader title={t('stats.title')} />

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium">{t('stats.period')}</legend>
        <div className="inline-flex rounded-xl border border-border bg-surface p-1">
          {PERIODS.map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors has-checked:bg-primary-soft has-checked:text-on-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="stats-period"
                checked={period === value}
                onChange={() => {
                  setPeriod(value);
                }}
                className="sr-only"
              />
              {t('stats.periodOption', { count: value })}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6">
        <StatTiles
          items={[
            {
              label: t('stats.streak'),
              value: tn('stats.streakDays', streak.current),
              tone: 'primary',
              detail: streakDetail(overview),
            },
            {
              label: t('stats.goal'),
              value: t(`stats.goalProgress.${goal.kind}`, {
                value: overview.progress.value,
                target: goal.target,
              }),
              detail: (
                <>
                  <GoalMeter progress={overview.progress} label={t('stats.goal')} />
                  <Link to="/settings" className="mt-1 inline-block text-primary underline">
                    {t('stats.goalSettings')}
                  </Link>
                </>
              ),
            },
            {
              label: t('stats.success'),
              value: success.rate === null ? '—' : formatPercent(success.rate),
              detail:
                success.rate === null
                  ? t('stats.successNone')
                  : tn('stats.successHint', success.graded),
            },
            {
              label: t('stats.studied'),
              value: studied,
              detail: `${t('stats.studyTime')} : ${t('stats.minutes', { count: minutes })}`,
            },
          ]}
        />

        <DailyChart activity={activity} goal={goal} />

        <section
          aria-labelledby="stats-levels"
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h2 id="stats-levels" className="mb-1 text-lg font-semibold">
            {t('stats.levelsTitle')}
          </h2>
          <p className="mb-4 text-sm text-fg-muted">{tn('counts.cards', totals.total)}</p>
          <LevelBar counts={totals} legend />
        </section>

        <SetsProgressList sets={sets} progress={progress} />
      </div>
    </>
  );
}
