import { Outlet } from 'react-router';
import { Toaster } from '@/components/Toaster';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { t } from '@/i18n';

/** Racine commune à tous les écrans : thème et lien d'évitement. */
export function RootLayout() {
  useApplyTheme();

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        onClick={(event) => {
          // Le routeur utilise le hash : on déplace le focus sans modifier l'URL.
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('app.skipToContent')}
      </a>
      <Outlet />
      <Toaster />
    </>
  );
}
