import { Link } from 'react-router';
import { LevelBar } from '@/components/LevelBar';
import { SET_COLOR_CLASSES } from '@/components/setColors';
import { TagList } from '@/components/TagList';
import { languageName } from '@/domain/languages';
import type { StudySet } from '@/domain/models';
import type { SrsCounts } from '@/domain/studyPlan';
import { formatPercent, t, tn } from '@/i18n';

interface SetSummaryCardProps {
  set: StudySet;
  cardCount: number;
  /** Répartition des cartes par niveau, affichée en barre de progression. */
  counts?: SrsCounts;
}

/** Aperçu d'un set dans une liste : toute la carte est cliquable. */
export function SetSummaryCard({ set, cardCount, counts }: SetSummaryCardProps) {
  return (
    <article className="relative flex h-full overflow-hidden rounded-2xl border border-border bg-surface transition-colors focus-within:border-primary hover:border-primary">
      <span aria-hidden="true" className={`w-1.5 shrink-0 ${SET_COLOR_CLASSES[set.color]}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h3 className="truncate text-lg font-semibold">
          <Link to={`/sets/${set.id}`} className="outline-none after:absolute after:inset-0">
            {set.title}
          </Link>
        </h3>
        <p className="text-sm text-fg-muted">
          {t('sets.langPair', {
            source: languageName(set.sourceLang),
            target: languageName(set.targetLang),
          })}{' '}
          · {tn('counts.cards', cardCount)}
        </p>
        {set.description && <p className="line-clamp-2 text-sm">{set.description}</p>}
        <TagList tags={set.tags} className="mt-auto pt-1" />
        {counts && counts.total > 0 && (
          <div className="flex items-center gap-3 pt-1">
            <LevelBar counts={counts} size="sm" className="flex-1" />
            <span className="shrink-0 text-xs text-fg-muted">
              {t('stats.masteredShare', { percent: formatPercent(counts.mastered / counts.total) })}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
