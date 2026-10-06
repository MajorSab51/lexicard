import { useEffect, useEffectEvent } from 'react';

export type ShortcutMap = Partial<Record<string, (event: KeyboardEvent) => void>>;

/** Éléments qui utilisent eux-mêmes ces touches (saisie, listes, curseurs). */
const TYPING_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
/** Éléments activés nativement par Espace et Entrée. */
const ACTIVATABLE_SELECTOR = 'button, a[href], summary, [role="button"], [role="radio"]';

function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return true;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (target.closest(TYPING_SELECTOR)) return true;
  // Sur un bouton, Espace et Entrée gardent leur comportement natif (pas de double action).
  return (
    (event.key === ' ' || event.key === 'Enter') && target.closest(ACTIVATABLE_SELECTOR) !== null
  );
}

/**
 * Raccourcis clavier globaux d'un écran, désactivés pendant la saisie de texte.
 * Les clés sont les valeurs de `KeyboardEvent.key` (`' '`, `'ArrowLeft'`, `'1'`…).
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shouldIgnore(event)) return;
    const handler = shortcuts[event.key];
    if (!handler) return;
    event.preventDefault();
    handler(event);
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      onKeyDown(event);
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [enabled]);
}
