import { create } from 'zustand';

/** Événement non standard de Chrome, Edge et Android : proposition d'installation. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  /** Proposition d'installation mise de côté, disponible tant que l'application n'est pas installée. */
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export const useInstallStore = create<InstallState>()(() => ({
  deferred: null,
  installed: false,
}));

/** L'application tourne-t-elle dans sa propre fenêtre (installée) ? */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Écoute les événements d'installation dès le démarrage : le navigateur envoie sa
 * proposition une seule fois, souvent avant l'ouverture des paramètres.
 */
export function listenForInstall(target: Window = window) {
  useInstallStore.setState({ installed: isStandalone() });
  target.addEventListener('beforeinstallprompt', (event) => {
    // Pas de bannière du navigateur : l'installation se propose dans les paramètres.
    event.preventDefault();
    useInstallStore.setState({ deferred: event as BeforeInstallPromptEvent });
  });
  target.addEventListener('appinstalled', () => {
    useInstallStore.setState({ deferred: null, installed: true });
  });
}

/** Ouvre la fenêtre d'installation du navigateur. Renvoie true si l'utilisateur accepte. */
export async function promptInstall(): Promise<boolean> {
  const { deferred } = useInstallStore.getState();
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  // Une proposition ne sert qu'une fois.
  useInstallStore.setState({ deferred: null });
  return outcome === 'accepted';
}
