import { Link } from 'react-router';
import { SET_COLOR_CLASSES } from '@/components/setColors';
import { TagList } from '@/components/TagList';
import { languageName } from '@/domain/languages';
import type { StudySet } from '@/domain/models';
import { t, tn } from '@/i18n';

interface SetSummaryCardProps {
  set: StudySet;
  cardCount: number;
}

/** Aperçu d'un set dans une liste : toute la carte est cliquable. */
export function SetSummaryCard({ set, cardCount }: SetSummaryCardProps) {
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
      </div>
    </article>
  );
}
