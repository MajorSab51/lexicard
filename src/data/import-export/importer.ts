import type { RawCardRow } from '@/domain/importPreview';
import type { CardContent, Id } from '@/domain/models';
import { addCards } from '../cardsRepository';
import { createSet, type SetInput } from '../setsRepository';
import { parseCardsCsv } from './csv';
import { ImportError } from './errors';
import { parseCardsJson } from './json';

export type ImportSourceFormat = 'csv' | 'json';

export interface ParsedCardsSource {
  format: ImportSourceFormat;
  rows: RawCardRow[];
  setMeta?: Partial<SetInput>;
}

/**
 * Lit un texte importé (fichier ou collage). Le format est déduit du nom de fichier,
 * sinon du contenu : un texte commençant par `{` ou `[` est traité comme du JSON.
 */
export function parseCardsSource(text: string, filename = ''): ParsedCardsSource {
  if (!text.trim()) throw new ImportError('empty');
  const lowerName = filename.toLowerCase();
  const looksLikeJson = /^\s*[[{]/.test(text.replace(/^\uFEFF/, ''));
  const isJson = lowerName.endsWith('.json') || (!lowerName.endsWith('.csv') && looksLikeJson);

  if (isJson) {
    const { rows, setMeta } = parseCardsJson(text);
    return { format: 'json', rows, ...(setMeta ? { setMeta } : {}) };
  }
  return { format: 'csv', rows: parseCardsCsv(text).rows };
}

export type ImportTarget = { kind: 'existing'; setId: Id } | { kind: 'new'; input: SetInput };

/** Enregistre les cartes retenues, dans un set existant ou dans un nouveau set. */
export async function commitImport(
  target: ImportTarget,
  contents: CardContent[],
): Promise<{ setId: Id; added: number }> {
  if (target.kind === 'new') {
    const set = await createSet(target.input, contents);
    return { setId: set.id, added: contents.length };
  }
  const added = await addCards(target.setId, contents);
  return { setId: target.setId, added };
}
