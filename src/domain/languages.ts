/**
 * Langues proposées pour les sets. Les codes BCP 47 servent aussi à choisir
 * la voix de synthèse vocale (jalon 2).
 */
export const LANGUAGE_CODES = [
  'fr',
  'en',
  'es',
  'de',
  'it',
  'pt',
  'nl',
  'sv',
  'da',
  'no',
  'fi',
  'pl',
  'cs',
  'el',
  'ru',
  'uk',
  'tr',
  'ar',
  'he',
  'hi',
  'zh',
  'ja',
  'ko',
  'vi',
  'id',
  'la',
] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const DEFAULT_SOURCE_LANG: LanguageCode = 'en';
export const DEFAULT_TARGET_LANG: LanguageCode = 'fr';

/** Nom lisible d'une langue dans la langue de l'interface (« anglais », « espagnol »…). */
export function languageName(code: string, uiLocale = 'fr'): string {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: 'language' }).of(code);
    if (!name || name === code) return code;
    return name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1);
  } catch {
    return code;
  }
}

export function isKnownLanguage(code: string): code is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(code);
}
