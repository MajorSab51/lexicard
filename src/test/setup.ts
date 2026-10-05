import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

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

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
});
