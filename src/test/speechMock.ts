import { vi } from 'vitest';

export interface MockVoice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export function mockVoice(name: string, lang: string, localService = true): MockVoice {
  return { voiceURI: name, name, lang, localService, default: false };
}

class MockUtterance {
  text: string;
  lang = '';
  voice: MockVoice | null = null;
  rate = 1;
  onend: ((event: Event) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

interface SpeechMockOptions {
  /** Voix renvoyées immédiatement par getVoices(). */
  voices?: MockVoice[];
  /** Erreur simulée à la lecture (`synthesis-failed`, `interrupted`…). */
  failWith?: string;
}

/**
 * Simule `speechSynthesis` (absent de jsdom). Chaque lecture se termine aussitôt,
 * avec succès ou avec l'erreur demandée. À appeler avant le rendu.
 */
export function installSpeechMock({ voices = [], failWith }: SpeechMockOptions = {}) {
  const spoken: MockUtterance[] = [];
  const listeners = new Set<() => void>();
  let currentVoices = voices;

  const synth = {
    getVoices: vi.fn(() => currentVoices),
    speak: vi.fn((utterance: MockUtterance) => {
      spoken.push(utterance);
      queueMicrotask(() => {
        if (failWith) utterance.onerror?.({ error: failWith });
        else utterance.onend?.(new Event('end'));
      });
    }),
    cancel: vi.fn(),
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener);
    }),
  };

  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: MockUtterance,
    configurable: true,
  });

  return {
    synth,
    spoken,
    /** Simule l'arrivée tardive des voix (événement `voiceschanged`). */
    setVoices(next: MockVoice[]) {
      currentVoices = next;
      listeners.forEach((listener) => {
        listener();
      });
    },
    uninstall() {
      Reflect.deleteProperty(window, 'speechSynthesis');
      Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
    },
  };
}
