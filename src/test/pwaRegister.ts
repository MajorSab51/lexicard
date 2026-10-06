import { useState } from 'react';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

/**
 * Remplace `virtual:pwa-register/react` dans les tests : Vitest ne sait pas charger ce
 * module virtuel. Comme en développement, aucun service worker n'est enregistré.
 */
export function useRegisterSW(_options?: RegisterSWOptions) {
  return {
    needRefresh: useState(false),
    offlineReady: useState(false),
    updateServiceWorker: (_reloadPage?: boolean) => Promise.resolve(),
  };
}
