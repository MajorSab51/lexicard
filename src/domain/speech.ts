/**
 * Choix d'une voix de synthèse vocale pour une langue. Logique pure : elle travaille sur
 * une description minimale des voix, ce qui permet de la tester sans navigateur.
 */
export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  /** Voix installée sur l'appareil (fonctionne hors ligne, aucun texte envoyé sur le réseau). */
  localService: boolean;
  default: boolean;
}

export const SPEECH_RATE = { min: 0.5, max: 1.5, step: 0.1, default: 1 } as const;

/** Variantes régionales proposées en priorité quand le set n'en précise pas. */
const PREFERRED_REGIONS: Readonly<Record<string, readonly string[]>> = {
  en: ['en-GB', 'en-US'],
  es: ['es-ES', 'es-MX', 'es-US'],
  pt: ['pt-PT', 'pt-BR'],
  fr: ['fr-FR', 'fr-CA'],
  de: ['de-DE', 'de-AT', 'de-CH'],
  it: ['it-IT'],
  nl: ['nl-NL', 'nl-BE'],
  zh: ['zh-CN', 'zh-TW', 'zh-HK'],
};

/** Normalise une étiquette de langue : `en_us` → `en-US` (certains Android utilisent `_`). */
export function normalizeLang(tag: string): string {
  const cleaned = tag.trim().replace(/_/g, '-');
  try {
    return Intl.getCanonicalLocales(cleaned)[0] ?? cleaned;
  } catch {
    return cleaned;
  }
}

/** Langue principale d'une étiquette : `en-GB` → `en`. */
export function primaryLanguage(tag: string): string {
  return normalizeLang(tag).split('-')[0]?.toLowerCase() ?? '';
}

/**
 * Voix compatibles avec une langue, de la plus adaptée à la moins adaptée :
 * même variante régionale que demandée, puis voix locales (hors ligne et confidentielles),
 * puis variante régionale préférée, puis voix par défaut du système, puis ordre alphabétique.
 */
export function rankVoices<V extends VoiceLike>(voices: readonly V[], lang: string): V[] {
  const wanted = normalizeLang(lang);
  const primary = primaryLanguage(lang);
  const regions = PREFERRED_REGIONS[primary] ?? [];
  const regionRank = (voice: V) => {
    const index = regions.indexOf(normalizeLang(voice.lang));
    return index === -1 ? regions.length : index;
  };

  return voices
    .filter((voice) => primaryLanguage(voice.lang) === primary)
    .sort((a, b) => {
      const exact =
        Number(normalizeLang(b.lang) === wanted) - Number(normalizeLang(a.lang) === wanted);
      if (exact !== 0) return exact;
      if (a.localService !== b.localService) return a.localService ? -1 : 1;
      const region = regionRank(a) - regionRank(b);
      if (region !== 0) return region;
      if (a.default !== b.default) return a.default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Voix à utiliser pour une langue : celle choisie dans les paramètres si elle existe encore
 * sur cet appareil, sinon la mieux classée. `null` si aucune voix ne parle cette langue.
 */
export function pickVoice<V extends VoiceLike>(
  voices: readonly V[],
  lang: string,
  preferredVoiceURI?: string,
): V | null {
  const ranked = rankVoices(voices, lang);
  return ranked.find((voice) => voice.voiceURI === preferredVoiceURI) ?? ranked[0] ?? null;
}

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return SPEECH_RATE.default;
  const clamped = Math.min(SPEECH_RATE.max, Math.max(SPEECH_RATE.min, rate));
  return Math.round(clamped * 10) / 10;
}
