import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '@/i18n';

/** Panneau d'options repliable d'un mode d'étude. */
export function OptionsPanel({ children }: { children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium select-none">
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        {t('study.options')}
      </summary>
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}
