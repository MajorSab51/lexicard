import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { ALL_TABLES, db } from '@/data/db';
import { useToastStore } from '@/lib/toast';

// jsdom ne fournit pas matchMedia : on simule un système en thème clair.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// jsdom n'implémente pas les méthodes modales de <dialog>.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, value?: string) {
    this.removeAttribute('open');
    if (value !== undefined) this.returnValue = value;
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(async () => {
  cleanup();
  localStorage.clear();
  useToastStore.setState({ toasts: [] });
  document.documentElement.className = '';
  await Promise.all(ALL_TABLES.map((table) => db.table(table).clear()));
});
