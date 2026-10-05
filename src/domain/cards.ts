import { emptyCardContent, GENDERS, PARTS_OF_SPEECH, type CardContent } from './models';
import { cleanText, termKey } from './text';

/** Nettoie le contenu d'une carte avant enregistrement. */
export function sanitizeCardContent(content: Partial<CardContent>): CardContent {
  const base = emptyCardContent();
  const partOfSpeech = content.partOfSpeech ?? '';
  const gender = content.gender ?? '';
  return {
    term: cleanText(content.term ?? base.term),
    translation: cleanText(content.translation ?? base.translation),
    example: cleanText(content.example ?? base.example),
    note: (content.note ?? base.note).trim(),
    imageUrl: cleanImageUrl(content.imageUrl ?? ''),
    partOfSpeech: (PARTS_OF_SPEECH as readonly string[]).includes(partOfSpeech) ? partOfSpeech : '',
    gender: (GENDERS as readonly string[]).includes(gender) ? gender : '',
  };
}

/** N'accepte que les liens http(s) pour les images ; tout le reste est ignoré. */
export function cleanImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch {
    return '';
  }
}

export function isBlankCard(content: Pick<CardContent, 'term' | 'translation'>): boolean {
  return !content.term.trim() && !content.translation.trim();
}

/** Une carte est valide si elle a un terme et une traduction. */
export function isCompleteCard(content: Pick<CardContent, 'term' | 'translation'>): boolean {
  return Boolean(content.term.trim() && content.translation.trim());
}

/**
 * Indices des cartes dont le terme apparaît déjà plus haut dans la liste.
 * La première occurrence n'est pas considérée comme un doublon.
 */
export function findDuplicateIndices(terms: readonly string[]): Set<number> {
  const seen = new Set<string>();
  const duplicates = new Set<number>();
  terms.forEach((term, index) => {
    const key = termKey(term);
    if (!key) return;
    if (seen.has(key)) duplicates.add(index);
    else seen.add(key);
  });
  return duplicates;
}

export type DuplicateKind = 'none' | 'existing' | 'file';

/**
 * Classe chaque terme importé : déjà présent dans le set (`existing`),
 * répété plus haut dans le fichier (`file`) ou nouveau (`none`).
 */
export function classifyDuplicates(
  incomingTerms: readonly string[],
  existingTerms: readonly string[],
): DuplicateKind[] {
  const existing = new Set(existingTerms.map(termKey));
  const seen = new Set<string>();
  return incomingTerms.map((term) => {
    const key = termKey(term);
    if (key && existing.has(key)) return 'existing';
    if (key && seen.has(key)) return 'file';
    seen.add(key);
    return 'none';
  });
}

/** Découpe une saisie d'étiquettes (« voyage, B1 ; verbes ») et retire les doublons. */
export function parseTags(input: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.split(/[,;]/)) {
    const tag = cleanText(raw).slice(0, 40);
    const key = tag.toLocaleLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}
