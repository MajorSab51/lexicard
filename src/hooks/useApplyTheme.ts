import { useEffect } from 'react';
import { useThemeStore } from '@/features/settings/themeStore';
import { applyTheme, resolveTheme } from '@/lib/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Applique le thème choisi et suit les changements du système en mode automatique. */
export function useApplyTheme() {
  const preference = useThemeStore((state) => state.preference);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const update = () => {
      applyTheme(resolveTheme(preference, media.matches));
    };
    update();
    if (preference !== 'system') return;
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
    };
  }, [preference]);
}
