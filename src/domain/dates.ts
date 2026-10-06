/**
 * Jours calendaires locaux, au format `AAAA-MM-JJ`.
 * La répétition espacée raisonne en jours, pas en heures : une carte prévue « demain »
 * est due dès minuit, heure locale. Le format se compare directement comme une chaîne.
 */

export type LocalDay = string;

const LOCAL_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** Jour local d'un instant donné. */
export function toLocalDay(date: Date): LocalDay {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parts(day: LocalDay): [number, number, number] {
  const match = LOCAL_DAY.exec(day);
  if (!match) throw new Error(`Jour invalide : ${day}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isLocalDay(value: unknown): value is LocalDay {
  if (typeof value !== 'string' || !LOCAL_DAY.test(value)) return false;
  const [year, month, day] = parts(value);
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

/** Ajoute (ou retire) des jours calendaires, sans être perturbé par les changements d'heure. */
export function addDays(day: LocalDay, count: number): LocalDay {
  const [year, month, date] = parts(day);
  return toLocalDay(new Date(year, month - 1, date + count));
}

/** Nombre de jours de `from` à `to` (négatif si `to` est avant `from`). */
export function daysBetween(from: LocalDay, to: LocalDay): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}
