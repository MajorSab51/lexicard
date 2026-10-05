import type { Id } from '@/domain/models';
import { slugify, todayStamp } from '@/lib/download';
import { getSetCards } from '../cardsRepository';
import { db } from '../db';
import { createBackup } from './backup';
import { cardsToCsv } from './csv';
import { buildSetExport } from './json';

export interface ExportFile {
  filename: string;
  content: string;
  mimeType: string;
}

// Le BOM permet à Excel de reconnaître l'UTF-8 (sinon les accents sont mal affichés).
const CSV_MIME = 'text/csv;charset=utf-8';
const JSON_MIME = 'application/json';
const BOM = '\uFEFF';

async function requireSet(setId: Id) {
  const set = await db.sets.get(setId);
  if (!set) throw new Error(`Set introuvable : ${setId}`);
  return set;
}

export async function exportSetCsv(setId: Id): Promise<ExportFile> {
  const set = await requireSet(setId);
  const cards = await getSetCards(setId);
  return {
    filename: `${slugify(set.title)}-${todayStamp()}.csv`,
    content: BOM + cardsToCsv(cards.map((content) => ({ content }))),
    mimeType: CSV_MIME,
  };
}

export async function exportSetJson(setId: Id): Promise<ExportFile> {
  const set = await requireSet(setId);
  const cards = await getSetCards(setId);
  return {
    filename: `${slugify(set.title)}-${todayStamp()}.json`,
    content: JSON.stringify(buildSetExport(set, cards), null, 2),
    mimeType: JSON_MIME,
  };
}

/** Toutes les cartes de tous les sets, avec une colonne `set`. */
export async function exportAllCardsCsv(): Promise<ExportFile> {
  const sets = await db.sets.orderBy('updatedAt').reverse().toArray();
  const rows = [];
  for (const set of sets) {
    const cards = await getSetCards(set.id);
    rows.push(...cards.map((content) => ({ setTitle: set.title, content })));
  }
  return {
    filename: `lexicards-cartes-${todayStamp()}.csv`,
    content: BOM + cardsToCsv(rows, true),
    mimeType: CSV_MIME,
  };
}

/** Sauvegarde complète (sets, cartes, progression, historique, paramètres). */
export async function exportBackup(): Promise<ExportFile> {
  const backup = await createBackup();
  return {
    filename: `lexicards-sauvegarde-${todayStamp()}.json`,
    content: JSON.stringify(backup),
    mimeType: JSON_MIME,
  };
}
