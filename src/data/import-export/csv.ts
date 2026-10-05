import Papa from 'papaparse';
import type { RawCardRow } from '@/domain/importPreview';
import type { CardContent } from '@/domain/models';
import { stripDiacritics } from '@/domain/text';
import { ImportError } from './errors';

type CardField = keyof CardContent;

/** Noms de colonnes reconnus (normalisés : minuscules, sans accents, espaces ni séparateurs). */
const HEADER_ALIASES: Record<string, CardField> = {
  terme: 'term',
  term: 'term',
  mot: 'term',
  word: 'term',
  recto: 'term',
  front: 'term',
  traduction: 'translation',
  translation: 'translation',
  definition: 'translation',
  sens: 'translation',
  verso: 'translation',
  back: 'translation',
  exemple: 'example',
  example: 'example',
  phrase: 'example',
  note: 'note',
  notes: 'note',
  remarque: 'note',
  image: 'imageUrl',
  imageurl: 'imageUrl',
  urlimage: 'imageUrl',
  categorie: 'partOfSpeech',
  category: 'partOfSpeech',
  partofspeech: 'partOfSpeech',
  nature: 'partOfSpeech',
  genre: 'gender',
  gender: 'gender',
};

/** Ordre des colonnes sans en-tête, conformément au format documenté `terme,traduction,exemple`. */
const POSITIONAL_FIELDS: readonly CardField[] = ['term', 'translation', 'example'];

/** Colonnes écrites à l'export (relisibles à l'import). */
const EXPORT_COLUMNS: readonly [CardField, string][] = [
  ['term', 'terme'],
  ['translation', 'traduction'],
  ['example', 'exemple'],
  ['note', 'note'],
  ['imageUrl', 'image'],
  ['partOfSpeech', 'categorie'],
  ['gender', 'genre'],
];

function normalizeHeader(cell: string): string {
  // Les chiffres sont conservés : « word0 » est une donnée, pas l'en-tête « word ».
  return stripDiacritics(cell)
    .toLowerCase()
    .replace(/[\s_.:()-]/g, '');
}

/**
 * Une première ligne est un en-tête si elle désigne au moins deux champs différents.
 * « word,mot » n'est donc pas un en-tête (deux synonymes de « terme ») mais une carte.
 */
function detectHeader(cells: readonly string[]): (CardField | null)[] | null {
  const mapping = cells.map((cell) => HEADER_ALIASES[normalizeHeader(cell)] ?? null);
  const distinct = new Set(mapping.filter((field) => field !== null));
  return distinct.size >= 2 ? mapping : null;
}

/** Retire l'apostrophe ajoutée à l'export devant les cellules ressemblant à une formule. */
function unescapeFormula(value: string): string {
  return /^'[=+@]/.test(value) ? value.slice(1) : value;
}

export interface CsvParseResult {
  rows: RawCardRow[];
  hasHeader: boolean;
  delimiter: string;
}

/** Lit un CSV de cartes. Séparateur détecté automatiquement : virgule, point-virgule, tabulation ou barre verticale. */
export function parseCardsCsv(text: string): CsvParseResult {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter: '',
    delimitersToGuess: [',', ';', '\t', '|'],
    skipEmptyLines: false,
  });
  const lines = result.data.map((cells, index) => ({ cells, line: index + 1 }));
  const nonEmpty = lines.filter(({ cells }) => cells.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length === 0) throw new ImportError('empty');

  const first = nonEmpty[0];
  const header = first ? detectHeader(first.cells) : null;
  const dataLines = header ? nonEmpty.slice(1) : nonEmpty;
  const mapping = header ?? POSITIONAL_FIELDS;

  if (!header && dataLines.every(({ cells }) => cells.length < 2)) {
    throw new ImportError('tooFewColumns');
  }

  const rows = dataLines.map(({ cells, line }): RawCardRow => {
    const fields: RawCardRow['fields'] = {};
    cells.forEach((cell, column) => {
      const field = mapping[column];
      if (field && fields[field] === undefined) fields[field] = unescapeFormula(cell);
    });
    return { line, fields };
  });

  return { rows, hasHeader: header !== null, delimiter: result.meta.delimiter };
}

export interface CsvExportRow {
  setTitle?: string;
  content: CardContent;
}

/**
 * Produit un CSV séparé par des virgules (RFC 4180, fins de ligne CRLF).
 * Avec `includeSet`, une première colonne `set` indique le set de chaque carte (export global).
 */
export function cardsToCsv(rows: readonly CsvExportRow[], includeSet = false): string {
  const fields = [...(includeSet ? ['set'] : []), ...EXPORT_COLUMNS.map(([, name]) => name)];
  const data = rows.map(({ setTitle = '', content }) => [
    ...(includeSet ? [setTitle] : []),
    ...EXPORT_COLUMNS.map(([field]) => content[field]),
  ]);
  return Papa.unparse(
    { fields, data },
    {
      newline: '\r\n',
      // Protège contre l'exécution de formules à l'ouverture dans un tableur.
      escapeFormulae: /^[=+@\t\r]/,
    },
  );
}
