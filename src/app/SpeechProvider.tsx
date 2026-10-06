import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SETTINGS, useSetting } from '@/data/settingsRepository';
import { languageName } from '@/domain/languages';
import { clampRate, pickVoice, primaryLanguage } from '@/domain/speech';
import { SpeechContext, speechKey, type SpeechContextValue } from '@/hooks/speechContext';
import { t } from '@/i18n';
import { isSpeechSupported, loadVoices, onVoicesChanged, speak, stopSpeaking } from '@/lib/speech';
import { toast } from '@/lib/toast';

/** Partage la liste des voix et les réglages audio avec tous les boutons de lecture. */
export function SpeechProvider({ children }: { children: ReactNode }) {
  const supported = isSpeechSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [loaded, setLoaded] = useState(!supported);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const rate = useSetting(SETTINGS.speechRate) ?? SETTINGS.speechRate.fallback;
  const preferredVoices = useSetting(SETTINGS.speechVoices) ?? SETTINGS.speechVoices.fallback;

  useEffect(() => {
    if (!supported) return;
    let active = true;
    const refresh = () => {
      void loadVoices().then((list) => {
        if (!active) return;
        setVoices(list);
        setLoaded(true);
      });
    };
    refresh();
    const unsubscribe = onVoicesChanged(refresh);
    return () => {
      active = false;
      unsubscribe();
      stopSpeaking();
    };
  }, [supported]);

  const say = useCallback(
    async (text: string, lang: string, key = speechKey(text, lang)) => {
      if (!supported) {
        toast(t('speech.unsupported'), 'error');
        return;
      }
      if (speakingKey === key) {
        stopSpeaking();
        return;
      }
      const primary = primaryLanguage(lang);
      const language = languageName(primary).toLocaleLowerCase('fr');
      const voice = pickVoice(voices, lang, preferredVoices[primary]);
      // Sans voix adaptée, le navigateur lirait le mot avec un accent étranger : on prévient plutôt.
      if (!voice && voices.length > 0) {
        toast(t('speech.noVoice', { language }), 'error');
        return;
      }

      setSpeakingKey(key);
      const outcome = await speak(text, { lang, voice, rate: clampRate(rate) });
      setSpeakingKey((current) => (current === key ? null : current));
      if (outcome === 'error') {
        toast(
          voices.length === 0 ? t('speech.noVoice', { language }) : t('speech.failed'),
          'error',
        );
      }
    },
    [supported, speakingKey, voices, preferredVoices, rate],
  );

  const value = useMemo<SpeechContextValue>(
    () => ({ supported, voices, loaded, speakingKey, say }),
    [supported, voices, loaded, speakingKey, say],
  );

  return <SpeechContext value={value}>{children}</SpeechContext>;
}
