import { db } from './db';

/** Lit un paramètre ; retourne la valeur par défaut s'il est absent ou d'un autre type. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const entry = await db.settings.get(key);
  if (entry === undefined || typeof entry.value !== typeof fallback) return fallback;
  return entry.value as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
