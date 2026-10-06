import { formatNumber } from '@/i18n';

export type StatTone = 'neutral' | 'primary' | 'success';

export interface StatTile {
  label: string;
  value: number;
  tone?: StatTone;
}

const TONES: Record<StatTone, string> = {
  neutral: '',
  primary: 'text-primary',
  success: 'text-success',
};

/** Petits compteurs (libellé et nombre), présentés en grille. */
export function StatTiles({ items, className = '' }: { items: StatTile[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2 ${className}`}>
      {items.map(({ label, value, tone = 'neutral' }) => (
        <div
          key={label}
          className="flex flex-col justify-between rounded-xl bg-surface-muted px-3 py-2.5"
        >
          <dt className="text-sm text-fg-muted">{label}</dt>
          <dd className={`text-2xl font-semibold tabular-nums ${TONES[tone]}`}>
            {formatNumber(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
