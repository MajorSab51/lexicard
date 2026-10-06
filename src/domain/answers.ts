import { cleanText, stripDiacritics } from './text';

/*
 * Correction des réponses écrites (modes Écrire et Test).
 * Une réponse est comparée à chaque formulation acceptée, après normalisation :
 * casse, espaces superflus et ponctuation ignorés ; accents ignorés ou non selon le réglage.
 */

export const TYPO_TOLERANCES = ['none', 'normal', 'lenient'] as const;
/** Fautes de frappe tolérées : aucune, une pour les mots d'au moins 5 lettres, ou davantage. */
export type TypoTolerance = (typeof TYPO_TOLERANCES)[number];

export interface AnswerTolerance {
  /** Accepter une réponse sans ses accents (« ete » pour « été »). */
  ignoreAccents: boolean;
  typos: TypoTolerance;
}

export const DEFAULT_ANSWER_TOLERANCE: AnswerTolerance = { ignoreAccents: true, typos: 'normal' };

export function isAnswerTolerance(value: unknown): value is AnswerTolerance {
  if (typeof value !== 'object' || value === null) return false;
  const { ignoreAccents, typos } = value as Record<string, unknown>;
  return (
    typeof ignoreAccents === 'boolean' &&
    typeof typos === 'string' &&
    (TYPO_TOLERANCES as readonly string[]).includes(typos)
  );
}

/** Correct, presque correct (faute tolérée ou accent manquant), ou faux. */
export type AnswerVerdict = 'correct' | 'almost' | 'wrong';

/** Nombre de fautes tolérées pour une réponse attendue de `length` lettres (espaces exclus). */
export function allowedTypos(length: number, typos: TypoTolerance): number {
  switch (typos) {
    case 'none':
      return 0;
    case 'normal':
      return length >= 5 ? 1 : 0;
    case 'lenient':
      if (length >= 9) return 2;
      return length >= 4 ? 1 : 0;
  }
}

/**
 * Distance de Levenshtein, où l'inversion de deux lettres voisines compte pour une seule faute
 * (« teh » pour « the ») : variante dite « optimal string alignment ».
 */
export function editDistance(a: string, b: string): number {
  const s = Array.from(a);
  const t = Array.from(b);
  // d[i][j] : distance entre les i premiers caractères de s et les j premiers de t.
  const d = Array.from({ length: s.length + 1 }, (_, i) =>
    Array.from({ length: t.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  const at = (i: number, j: number) => d[i]?.[j] ?? Infinity;

  for (let i = 1; i <= s.length; i++) {
    const row = d[i];
    if (!row) continue;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        best = Math.min(best, at(i - 2, j - 2) + 1);
      }
      row[j] = best;
    }
  }
  return at(s.length, t.length);
}

/** Forme comparable d'une réponse : minuscules, sans ponctuation, espaces réduits. */
export function normalizeAnswer(text: string, ignoreAccents: boolean): string {
  let value = text.normalize('NFC').toLocaleLowerCase();
  if (ignoreAccents) value = stripDiacritics(value);
  return value
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formulations acceptées d'une réponse attendue : la réponse entière, chaque partie séparée
 * par « ; » ou « / », et chacune avec ou sans le texte entre parenthèses (« (to) run »).
 */
export function acceptedAnswers(expected: string): string[] {
  const variants = new Set<string>();
  for (const piece of [expected, ...expected.split(/[;/]/)]) {
    for (const variant of [piece.replace(/\([^)]*\)/g, ' '), piece]) {
      const cleaned = cleanText(variant);
      if (cleaned) variants.add(cleaned);
    }
  }
  return [...variants];
}

/** Compare une réponse donnée à la réponse attendue, selon la tolérance choisie. */
export function checkAnswer(
  given: string,
  expected: string,
  tolerance: AnswerTolerance,
): AnswerVerdict {
  const answer = normalizeAnswer(given, tolerance.ignoreAccents);
  if (!answer) return 'wrong';

  let verdict: AnswerVerdict = 'wrong';
  for (const variant of acceptedAnswers(expected)) {
    const target = normalizeAnswer(variant, tolerance.ignoreAccents);
    if (!target) continue;
    if (answer === target) return 'correct';

    // Quand les accents comptent, une réponse juste à un accent près reste « presque correcte ».
    const accentsOnly =
      !tolerance.ignoreAccents && normalizeAnswer(given, true) === normalizeAnswer(variant, true);
    const typos = allowedTypos(target.replace(/ /g, '').length, tolerance.typos);
    if (accentsOnly || (typos > 0 && editDistance(answer, target) <= typos)) verdict = 'almost';
  }
  return verdict;
}
