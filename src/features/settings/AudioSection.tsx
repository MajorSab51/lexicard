import { Volume2 } from 'lucide-react';
import { useId, useMemo } from 'react';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/fields';
import { useSets } from '@/data/hooks';
import { saveSetting, SETTINGS, useSetting } from '@/data/settingsRepository';
import { DEFAULT_SOURCE_LANG, languageName } from '@/domain/languages';
import { clampRate, primaryLanguage, rankVoices, SPEECH_RATE } from '@/domain/speech';
import { useSpeech } from '@/hooks/speechContext';
import { t } from '@/i18n';

/** Langues proposées quand aucun set n'existe encore. */
const FALLBACK_LANGUAGES = [DEFAULT_SOURCE_LANG, 'es', 'de'];

/** Nom d'une langue dans cette langue même (« español », « Deutsch ») : phrase de test universelle. */
function autonym(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function AudioSection() {
  const rateId = useId();
  const { supported, voices, loaded, say } = useSpeech();
  const rate = useSetting(SETTINGS.speechRate) ?? SETTINGS.speechRate.fallback;
  const preferred = useSetting(SETTINGS.speechVoices) ?? SETTINGS.speechVoices.fallback;
  const sets = useSets();

  // Les langues des sets existants, sinon quelques langues courantes (null pendant le chargement).
  const languages = useMemo(() => {
    if (!sets) return null;
    const codes = new Set<string>();
    for (const set of sets) {
      codes.add(primaryLanguage(set.sourceLang));
      codes.add(primaryLanguage(set.targetLang));
    }
    const list = codes.size > 0 ? [...codes] : FALLBACK_LANGUAGES;
    return list.sort((a, b) => languageName(a).localeCompare(languageName(b), 'fr'));
  }, [sets]);

  const chooseVoice = (lang: string, voiceURI: string) => {
    const next = Object.fromEntries(Object.entries(preferred).filter(([key]) => key !== lang));
    if (voiceURI) next[lang] = voiceURI;
    void saveSetting(SETTINGS.speechVoices, next);
  };

  return (
    <section
      aria-labelledby="settings-audio"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="settings-audio" className="mb-4 text-lg font-semibold">
        {t('settings.audio')}
      </h2>

      {!supported ? (
        <p className="text-fg-muted">{t('speech.unsupported')}</p>
      ) : (
        <div className="grid gap-6">
          <div className="sm:max-w-md">
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor={rateId} className="font-medium">
                {t('settings.speechRate')}
              </label>
              <output htmlFor={rateId} className="text-sm text-fg-muted tabular-nums">
                {t('settings.speechRateValue', { rate: clampRate(rate).toFixed(1) })}
              </output>
            </div>
            <input
              id={rateId}
              type="range"
              min={SPEECH_RATE.min}
              max={SPEECH_RATE.max}
              step={SPEECH_RATE.step}
              value={rate}
              onChange={(event) =>
                void saveSetting(SETTINGS.speechRate, clampRate(Number(event.target.value)))
              }
              className="w-full accent-(--primary)"
            />
          </div>

          <div>
            <h3 className="font-medium">{t('settings.voices')}</h3>
            <p className="mt-1 mb-4 text-sm text-fg-muted">{t('settings.voicesHint')}</p>
            {!loaded || !languages ? (
              <p className="text-fg-muted">{t('settings.loadingVoices')}</p>
            ) : (
              <ul className="grid gap-4">
                {languages.map((lang) => {
                  const ranked = rankVoices(voices, lang);
                  const automatic = ranked[0];
                  const language = languageName(lang);
                  return (
                    <li key={lang} className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
                      <SelectField
                        label={language}
                        value={
                          ranked.some((voice) => voice.voiceURI === preferred[lang])
                            ? preferred[lang]
                            : ''
                        }
                        disabled={ranked.length === 0}
                        hint={ranked.length === 0 ? t('settings.noVoiceFor') : undefined}
                        onChange={(event) => {
                          chooseVoice(lang, event.target.value);
                        }}
                      >
                        <option value="">
                          {automatic
                            ? t('settings.voiceAutomatic', { name: automatic.name })
                            : t('settings.voiceAutomaticNone')}
                        </option>
                        {ranked.map((voice) => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.localService
                              ? voice.name
                              : t('settings.voiceOnline', { name: voice.name })}
                          </option>
                        ))}
                      </SelectField>
                      {ranked.length > 0 && (
                        <Button
                          variant="secondary"
                          aria-label={t('settings.testVoiceFor', { language })}
                          onClick={() => void say(autonym(lang), lang)}
                          className="sm:mb-0"
                        >
                          <Volume2 aria-hidden="true" className="size-5" />
                          {t('settings.testVoice')}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
