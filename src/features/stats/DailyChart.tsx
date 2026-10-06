import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { DailyGoal, DayActivity } from '@/domain/stats';
import { formatLongDay, formatNumber, formatShortDay, t, tn } from '@/i18n';

interface DailyChartProps {
  activity: DayActivity[];
  goal: DailyGoal;
}

const AXIS_TICK = { fill: 'var(--fg-muted)', fontSize: 12 };

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function DayTooltip({ active, payload }: TooltipContentProps) {
  const day = payload[0]?.payload as DayActivity | undefined;
  if (!active || !day) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-fg-muted">{formatLongDay(day.day)}</p>
      <p className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="h-0.5 w-3 rounded bg-primary" />
        {tn('stats.tooltipCards', day.cards)}
      </p>
      <p className="text-fg-muted">
        {tn('stats.tooltipReviews', day.reviews)} ·{' '}
        {t('stats.minutes', { count: Math.round(day.durationMs / 60_000) })}
      </p>
    </div>
  );
}

/** Colonnes des cartes étudiées par jour, avec la ligne d'objectif et un tableau de données. */
export function DailyChart({ activity, goal }: DailyChartProps) {
  const [animate] = useState(() => !prefersReducedMotion());
  const empty = activity.every((day) => day.reviews === 0);
  const goalLine = goal.kind === 'cards' ? goal.target : null;

  return (
    <section
      aria-labelledby="stats-daily"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="stats-daily" className="text-lg font-semibold">
        {t('stats.dailyTitle')}
      </h2>
      <p className="mb-4 text-sm text-fg-muted">{t('stats.dailySubtitle')}</p>

      {empty ? (
        <p className="py-10 text-center text-fg-muted">{t('stats.dailyEmpty')}</p>
      ) : (
        // Le graphique est décoratif pour les lecteurs d'écran : le tableau ci-dessous le remplace.
        <div aria-hidden="true" className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activity}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              // Pas de navigation clavier dans un graphique masqué : le tableau la remplace.
              accessibilityLayer={false}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickFormatter={formatShortDay}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatNumber(value)}
              />
              <Tooltip
                content={DayTooltip}
                cursor={{ fill: 'var(--surface-muted)' }}
                isAnimationActive={false}
              />
              {goalLine !== null && (
                <ReferenceLine
                  y={goalLine}
                  stroke="var(--fg-muted)"
                  ifOverflow="extendDomain"
                  label={{
                    value: t('stats.goalLine', { target: formatNumber(goalLine) }),
                    position: 'insideTopRight',
                    fill: 'var(--fg-muted)',
                    fontSize: 12,
                  }}
                />
              )}
              <Bar
                dataKey="cards"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={animate}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          {t('stats.showData')}
        </summary>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('stats.dailyTitle')}</caption>
            <thead className="sticky top-0 bg-surface-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t('stats.table.day')}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t('stats.table.cards')}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t('stats.table.reviews')}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t('stats.table.minutes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {[...activity].reverse().map((day) => (
                <tr key={day.day}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {formatLongDay(day.day)}
                  </th>
                  <td className="px-3 py-1.5 text-right">{formatNumber(day.cards)}</td>
                  <td className="px-3 py-1.5 text-right">{formatNumber(day.reviews)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {formatNumber(Math.round(day.durationMs / 60_000))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
