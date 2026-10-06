import type { SrsCounts } from '@/domain/studyPlan';
import { formatNumber, formatPercent, t } from '@/i18n';

const LEVELS = [
  { key: 'new', label: 'srs.new', color: 'bg-level-new' },
  { key: 'learning', label: 'srs.learning', color: 'bg-level-learning' },
  { key: 'mastered', label: 'srs.mastered', color: 'bg-level-mastered' },
] as const;

interface LevelBarProps {
  counts: Pick<SrsCounts, 'new' | 'learning' | 'mastered' | 'total'>;
  /** Affiche la légende avec les nombres et les pourcentages. */
  legend?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Répartition des cartes par niveau : barre empilée (nouvelles → en cours → maîtrisées),
 * segments séparés par un fin espace. Les nombres restent lisibles dans la légende.
 */
export function LevelBar({ counts, legend = false, size = 'md', className = '' }: LevelBarProps) {
  const summary = t('stats.levelsSummary', {
    new: counts.new,
    learning: counts.learning,
    mastered: counts.mastered,
  });
  const share = (value: number) => (counts.total === 0 ? 0 : value / counts.total);

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={summary}
        className={`flex gap-0.5 overflow-hidden rounded bg-surface-muted ${size === 'sm' ? 'h-2' : 'h-3'}`}
      >
        {LEVELS.map(({ key, label, color }) =>
          counts[key] > 0 ? (
            <div
              key={key}
              title={`${t(label)} : ${formatNumber(counts[key])}`}
              className={`${color} first:rounded-l last:rounded-r`}
              style={{ flexGrow: counts[key], flexBasis: 0 }}
            />
          ) : null,
        )}
      </div>
      {legend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {LEVELS.map(({ key, label, color }) => (
            <li key={key} className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-3 rounded-sm ${color}`} />
              <span className="text-fg-muted">{t(label)}</span>
              <span className="font-semibold">{formatNumber(counts[key])}</span>
              <span className="text-fg-muted">({formatPercent(share(counts[key]))})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
