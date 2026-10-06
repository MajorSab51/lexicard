import { CircleCheck, MonitorDown, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { t } from '@/i18n';
import { promptInstall, useInstallStore } from '@/lib/install';

type OfflineStatus = 'ready' | 'pending' | 'unsupported';

/** iPhone et iPad (y compris un iPad qui se présente comme un Mac) : installation manuelle. */
function isAppleMobile(): boolean {
  const { userAgent, maxTouchPoints } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** État du mode hors ligne : un service worker actif signifie que l'application est en cache. */
function useOfflineStatus(): OfflineStatus | null {
  // Hors HTTPS (ou dans un navigateur ancien), les service workers sont indisponibles.
  const supported = 'serviceWorker' in navigator;
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (active) setReady(Boolean(registration?.active));
    });
    void navigator.serviceWorker.ready.then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [supported]);

  if (!supported) return 'unsupported';
  if (ready === null) return null;
  return ready ? 'ready' : 'pending';
}

const OFFLINE_MESSAGES = {
  ready: 'settings.offlineReady',
  pending: 'settings.offlinePending',
  unsupported: 'settings.offlineUnsupported',
} as const;

/** Installation sur l'appareil, état du mode hors ligne et version. */
export function AppSection() {
  const deferred = useInstallStore((state) => state.deferred);
  const installed = useInstallStore((state) => state.installed);
  const offline = useOfflineStatus();

  let install;
  if (installed) {
    install = (
      <p className="flex items-center gap-2">
        <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
        {t('settings.installed')}
      </p>
    );
  } else if (deferred) {
    install = (
      <div>
        <Button onClick={() => void promptInstall()}>
          <MonitorDown aria-hidden="true" className="size-5" />
          {t('settings.install')}
        </Button>
        <p className="mt-1.5 text-sm text-fg-muted">{t('settings.installHint')}</p>
      </div>
    );
  } else {
    install = (
      <p className="text-fg-muted">
        {isAppleMobile() ? t('settings.installIos') : t('settings.installOther')}
      </p>
    );
  }

  return (
    <section
      aria-labelledby="settings-app"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="settings-app" className="mb-4 text-lg font-semibold">
        {t('settings.app')}
      </h2>
      <div className="grid gap-4">
        {install}
        {offline && (
          <div className="flex gap-3 rounded-xl bg-surface-muted p-3 text-sm">
            <WifiOff aria-hidden="true" className="size-5 shrink-0 text-fg-muted" />
            <p>
              <strong>{t('settings.offline')}</strong> — {t(OFFLINE_MESSAGES[offline])}
            </p>
          </div>
        )}
        <p className="text-sm text-fg-muted">
          {t('settings.version', { version: __APP_VERSION__ })}
        </p>
      </div>
    </section>
  );
}
