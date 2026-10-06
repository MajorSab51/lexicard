import { Link } from 'react-router';
import { LevelBar } from '@/components/LevelBar';
import type { Id, StudySet } from '@/domain/models';
import { emptyCounts, type SrsCounts } from '@/domain/studyPlan';
import { formatPercent, t, tn } from '@/i18n';

interface SetsProgressListProps {
  sets: StudySet[];
  progress: ReadonlyMap<Id, SrsCounts>;
}

/** Progression de chaque set : répartition par niveau et part de cartes maîtrisées. */
export function SetsProgressList({ sets, progress }: SetsProgressListProps) {
  return (
    <section
      aria-labelledby="stats-sets"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="stats-sets" className="mb-4 text-lg font-semibold">
        {t('stats.setsTitle')}
      </h2>
      <ul className="grid gap-4">
        {sets.map((set) => {
          const counts = progress.get(set.id) ?? emptyCounts();
          const mastered = counts.total === 0 ? 0 : counts.mastered / counts.total;
          return (
            <li key={set.id}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <Link to={`/sets/${set.id}`} className="font-medium hover:underline">
                  {set.title}
                </Link>
                <span className="text-sm text-fg-muted">
                  {tn('counts.cards', counts.total)} ·{' '}
                  {t('stats.masteredShare', { percent: formatPercent(mastered) })}
                </span>
              </div>
              <LevelBar counts={counts} size="sm" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
