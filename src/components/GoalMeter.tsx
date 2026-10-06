import { CircleCheck } from 'lucide-react';
import type { GoalProgress } from '@/domain/stats';
import { formatPercent, t } from '@/i18n';

/** Jauge de l'objectif du jour. */
export function GoalMeter({ progress, label }: { progress: GoalProgress; label: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={Math.min(progress.value, progress.target)}
        aria-valuetext={formatPercent(progress.ratio)}
        className="block h-2 overflow-hidden rounded-full bg-primary-soft"
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${String(progress.ratio * 100)}%` }}
        />
      </span>
      {progress.reached && (
        <span className="flex items-center gap-1 font-medium text-success">
          <CircleCheck aria-hidden="true" className="size-4" />
          {t('stats.goalReached')}
        </span>
      )}
    </span>
  );
}
