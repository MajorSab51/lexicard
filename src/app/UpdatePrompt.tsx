import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { toast } from '@/lib/toast';

/**
 * Enregistre le service worker et propose les nouvelles versions. La mise à jour recharge
 * la page : elle attend donc l'accord de l'utilisateur pour ne pas couper une session.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onOfflineReady() {
      toast(t('pwa.offlineReady'), 'info');
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <RefreshCw aria-hidden="true" className="size-5 shrink-0 text-primary" />
      <p className="min-w-40 flex-1 text-sm">{t('pwa.updateAvailable')}</p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            setNeedRefresh(false);
          }}
        >
          {t('pwa.later')}
        </Button>
        <Button onClick={() => void updateServiceWorker(true)}>{t('pwa.update')}</Button>
      </div>
    </div>
  );
}
