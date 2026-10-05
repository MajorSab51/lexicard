import { classifyDuplicates, isCompleteCard, sanitizeCardContent } from './cards';
import {
  GENDERS,
  PARTS_OF_SPEECH,
  type CardContent,
  type Gender,
  type PartOfSpeech,
} from './models';
import { stripDiacritics } from './text';

/** Ligne brute issue d'un fichier importé, avant validation. */
export interface RawCardRow {
  /** Numéro de ligne dans le fichier source (1 = première ligne), pour les messages. */
  line: number;
  fields: Partial<Record<keyof CardContent, string>>;
}

export type PreviewStatus = 'ok' | 'duplicate-existing' | 'duplicate-file' | 'invalid';

export interface PreviewRow {
  line: number;
  content: CardContent;
  status: PreviewStatus;
  /** Sélection par défaut : seules les lignes valides et nouvelles sont cochées. */
  selected: boolean;
}

export interface ImportPreview {
  rows: PreviewRow[];
  counts: Record<PreviewStatus, number>;
}

function normalizeLabel(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

const PART_OF_SPEECH_ALIASES: Record<string, PartOfSpeech> = {
  nom: 'noun',
  n: 'noun',
  substantif: 'noun',
  verbe: 'verb',
  v: 'verb',
  adjectif: 'adjective',
  adj: 'adjective',
  adverbe: 'adverb',
  adv: 'adverb',
  pronom: 'pronoun',
  preposition: 'preposition',
  prep: 'preposition',
  conjonction: 'conjunction',
  conj: 'conjunction',
  interjection: 'interjection',
  expression: 'expression',
  locution: 'expression',
  autre: 'other',
};

/** Interprète une catégorie grammaticale écrite en anglais (clé interne) ou en français. */
export function parsePartOfSpeech(value: string): PartOfSpeech | '' {
  const label = normalizeLabel(value);
  if (!label) return '';
  if ((PARTS_OF_SPEECH as readonly string[]).includes(label)) return label as PartOfSpeech;
  return PART_OF_SPEECH_ALIASES[label] ?? '';
}

const GENDER_ALIASES: Record<string, Gender> = {
  m: 'masculine',
  masc: 'masculine',
  masculin: 'masculine',
  f: 'feminine',
  fem: 'feminine',
  feminin: 'feminine',
  n: 'neuter',
  neutre: 'neuter',
};

export function parseGender(value: string): Gender | '' {
  const label = normalizeLabel(value);
  if (!label) return '';
  if ((GENDERS as readonly string[]).includes(label)) return label as Gender;
  return GENDER_ALIASES[label] ?? '';
}

/**
 * Prépare la prévisualisation d'un import : nettoyage, validation
 * et détection des doublons (avec les cartes du set cible et à l'intérieur du fichier).
 */
export function buildImportPreview(
  rawRows: readonly RawCardRow[],
  existingTerms: readonly string[],
): ImportPreview {
  const contents = rawRows.map(({ fields }) =>
    sanitizeCardContent({
      ...fields,
      partOfSpeech: parsePartOfSpeech(fields.partOfSpeech ?? ''),
      gender: parseGender(fields.gender ?? ''),
    }),
  );
  const valid = contents.map((content) => isCompleteCard(content));
  // Les lignes invalides ne comptent pas pour la détection des doublons internes.
  const duplicates = classifyDuplicates(
    contents.map((content, index) => (valid[index] ? content.term : '')),
    existingTerms,
  );

  const counts: Record<PreviewStatus, number> = {
    ok: 0,
    'duplicate-existing': 0,
    'duplicate-file': 0,
    invalid: 0,
  };
  const rows = rawRows.map(({ line }, index): PreviewRow => {
    const content = contents[index] ?? sanitizeCardContent({});
    let status: PreviewStatus = 'ok';
    if (!valid[index]) status = 'invalid';
    else if (duplicates[index] === 'existing') status = 'duplicate-existing';
    else if (duplicates[index] === 'file') status = 'duplicate-file';
    counts[status] += 1;
    return { line, content, status, selected: status === 'ok' };
  });
  return { rows, counts };
}
