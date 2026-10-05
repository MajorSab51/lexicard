import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { t } from '@/i18n';
import { useToastStore, type ToastTone } from '@/lib/toast';

const ICONS: Record<ToastTone, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
};

/** Zone d'affichage des messages éphémères, au-dessus de la barre d'onglets sur mobile. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map(({ id, message, tone }) => {
        const Icon = ICONS[tone];
        return (
          <div
            key={id}
            role={tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
          >
            <Icon aria-hidden="true" className={`size-5 shrink-0 ${TONE_CLASSES[tone]}`} />
            <p className="flex-1 text-sm">{message}</p>
            <button
              type="button"
              onClick={() => {
                dismiss(id);
              }}
              aria-label={t('common.close')}
              className="flex size-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
