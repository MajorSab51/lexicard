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

type Params = Record<string, string | number>;

function format(value: string | number): string {
  return typeof value === 'number' ? new Intl.NumberFormat(currentLocale).format(value) : value;
}

/** Traduit une clé et remplace les variables `{nom}` par les valeurs fournies. */
export function t(key: MessageKey, params?: Params): string {
  const template = lookup(dictionaries[currentLocale], key);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : format(value);
  });
}

/** Nœud de dictionnaire gérant le pluriel : `{ one: '{count} carte', other: '{count} cartes' }`. */
interface PluralNode {
  readonly one: string;
  readonly other: string;
}
type PluralPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends PluralNode
    ? `${Prefix}${K}`
    : T[K] extends string
      ? never
      : PluralPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type PluralKey = PluralPaths<Messages>;

/** Traduit une clé plurielle selon `count` (règles de la langue : en français, 0 et 1 sont au singulier). */
export function tn(key: PluralKey, count: number, params?: Params): string {
  const form = new Intl.PluralRules(currentLocale).select(count) === 'one' ? 'one' : 'other';
  return t(`${key}.${form}` as MessageKey, { count, ...params });
}

/** Écart en jours exprimé en langage courant : « aujourd’hui », « demain », « dans 6 jours ». */
export function formatRelativeDays(days: number): string {
  return new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' }).format(days, 'day');
}

export function formatNumber(value: number): string {
  return format(value);
}

/** Durée en secondes avec un chiffre après la virgule : « 12,3 s ». */
export function formatSeconds(ms: number): string {
  return new Intl.NumberFormat(currentLocale, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'short',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.floor(ms / 100) / 10);
}

/** Jour court : « 6 oct. ». */
export function formatShortDay(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(currentLocale, { day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, date),
  );
}

/** Jour complet : « mardi 6 octobre ». */
export function formatLongDay(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(currentLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, date));
}

/** Pourcentage arrondi à l'unité : « 75 % ». */
export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(currentLocale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(ratio);
}
