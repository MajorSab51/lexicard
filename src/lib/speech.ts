/**
 * Accès à la synthèse vocale du navigateur (Web Speech API, `speechSynthesis`).
 * Aucune bibliothèque : les voix sont celles du système ou du navigateur.
 */

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/**
 * Liste des voix. Beaucoup de navigateurs la chargent de façon différée : on attend
 * l'événement `voiceschanged`, avec un délai maximal car Safari ne le déclenche pas toujours.
 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const initial = synth.getVoices();
  if (initial.length > 0) return Promise.resolve(initial);

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(finish, timeoutMs);
    synth.addEventListener('voiceschanged', finish);
  });
}

/** Prévient quand la liste des voix change (installation d'une voix, chargement tardif). */
export function onVoicesChanged(callback: () => void): () => void {
  if (!isSpeechSupported()) return () => undefined;
  const synth = window.speechSynthesis;
  synth.addEventListener('voiceschanged', callback);
  return () => {
    synth.removeEventListener('voiceschanged', callback);
  };
}

export type SpeakOutcome = 'ended' | 'interrupted' | 'error';

interface SpeakOptions {
  lang: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
}

/** Prononce un texte en interrompant la lecture en cours. Doit être appelé suite à un geste (iOS). */
export function speak(text: string, { lang, voice, rate }: SpeakOptions): Promise<SpeakOutcome> {
  if (!isSpeechSupported()) return Promise.resolve('error');
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? lang;
  if (voice) utterance.voice = voice;
  utterance.rate = rate;

  return new Promise((resolve) => {
    utterance.onend = () => {
      resolve('ended');
    };
    utterance.onerror = (event) => {
      resolve(
        event.error === 'interrupted' || event.error === 'canceled' ? 'interrupted' : 'error',
      );
    };
    synth.speak(utterance);
  });
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
