import { Outlet } from 'react-router';
import { Toaster } from '@/components/Toaster';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { t } from '@/i18n';
import { SpeechProvider } from './SpeechProvider';
import { UpdatePrompt } from './UpdatePrompt';

/**
 * Racine commune à tous les écrans : thème, synthèse vocale, notifications,
 * mises à jour de l'application et lien d'évitement.
 */
export function RootLayout() {
  useApplyTheme();

  return (
    <SpeechProvider>
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
      <Toaster>
        <UpdatePrompt />
      </Toaster>
    </SpeechProvider>
  );
}
