import { LoaderCircle } from 'lucide-react';
import { t } from '@/i18n';

/** Indicateur de chargement, affiché pendant la lecture d'IndexedDB. */
export function Loading() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-fg-muted">
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      <span>{t('common.loading')}</span>
    </div>
  );
}
