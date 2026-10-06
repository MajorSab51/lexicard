import { createContext, useContext } from 'react';

export interface SpeechContextValue {
  /** Le navigateur propose-t-il la synthèse vocale ? */
  supported: boolean;
  voices: readonly SpeechSynthesisVoice[];
  /** La liste des voix a-t-elle fini de charger ? */
  loaded: boolean;
  /** Clé de la lecture en cours (voir `say`), ou `null`. */
  speakingKey: string | null;
  /** Prononce un texte dans une langue. Une seconde demande avec la même clé arrête la lecture. */
  say: (text: string, lang: string, key?: string) => Promise<void>;
}

export const SpeechContext = createContext<SpeechContextValue>({
  supported: false,
  voices: [],
  loaded: true,
  speakingKey: null,
  say: () => Promise.resolve(),
});

export function useSpeech(): SpeechContextValue {
  return useContext(SpeechContext);
}

/** Clé identifiant une lecture : même texte et même langue. */
export function speechKey(text: string, lang: string): string {
  return `${lang}:${text}`;
}
