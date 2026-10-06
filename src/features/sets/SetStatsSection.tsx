import { LevelBar } from '@/components/LevelBar';
import { StatTiles } from '@/components/StatTiles';
import { useSetStats } from '@/data/statsHooks';
import type { StudySet } from '@/domain/models';
import { formatPercent, t, tn } from '@/i18n';

/** Statistiques d'un set : niveaux, réussite, activité récente et cartes les plus difficiles. */
export function SetStatsSection({ set }: { set: StudySet }) {
  const stats = useSetStats(set.id);
  if (!stats || stats.counts.total === 0) return null;
  const { counts, success, recentReviews, hardest } = stats;

  return (
    <section aria-labelledby="set-progress" className="mb-8">
      <h2 id="set-progress" className="mb-3 text-lg font-semibold">
        {t('stats.progressTitle')}
      </h2>
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
        <LevelBar counts={counts} legend />
        <StatTiles
          items={[
            {
              label: t('stats.success'),
              value: success.rate === null ? '—' : formatPercent(success.rate),
              detail:
                success.rate === null
                  ? t('stats.successNone')
                  : tn('stats.successHint', success.graded),
            },
            { label: t('stats.recentReviews'), value: recentReviews },
          ]}
        />
        <div>
          <h3 className="mb-2 font-semibold">{t('stats.hardestTitle')}</h3>
          {hardest.length === 0 ? (
            <p className="text-sm text-fg-muted">{t('stats.hardestEmpty')}</p>
          ) : (
            <ol className="divide-y divide-border rounded-xl border border-border">
              {hardest.map(({ card, failures, graded }) => (
                <li
                  key={card.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2"
                >
                  <span>
                    <span lang={set.sourceLang} className="font-medium">
                      {card.term}
                    </span>
                    <span aria-hidden="true" className="mx-1.5 text-fg-muted">
                      →
                    </span>
                    <span lang={set.targetLang}>{card.translation}</span>
                  </span>
                  <span className="text-sm text-fg-muted">
                    {tn('stats.failures', failures, { graded })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
