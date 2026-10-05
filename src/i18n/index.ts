import { fr } from './fr';

/** Forme d'un dictionnaire : même arborescence que `fr`, avec des chaînes libres. */
type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
export type Messages = DeepStrings<typeof fr>;

/** Toutes les clés pointées valides, par exemple `'nav.home'`. */
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

export type Locale = 'fr';
export const DEFAULT_LOCALE: Locale = 'fr';

const dictionaries: Record<Locale, Messages> = { fr };
let currentLocale: Locale = DEFAULT_LOCALE;

export function getLocale(): Locale {
  return currentLocale;
}

/** Change la langue. L'interface doit être re-rendue (rechargement) pour en tenir compte. */
export function setLocale(locale: Locale) {
  currentLocale = locale;
  document.documentElement.lang = locale;
}

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}

/** Traduit une clé et remplace les variables `{nom}` par les valeurs fournies. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = lookup(dictionaries[currentLocale], key);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
