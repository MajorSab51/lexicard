import {
  buildImportPreview,
  parseGender,
  parsePartOfSpeech,
  type RawCardRow,
} from './importPreview';

const row = (line: number, term: string, translation: string, extra = {}): RawCardRow => ({
  line,
  fields: { term, translation, ...extra },
});

describe('buildImportPreview', () => {
  it('classe les lignes et ne coche que les nouvelles cartes valides', () => {
    const preview = buildImportPreview(
      [
        row(1, 'cat', 'chat'),
        row(2, 'Dog', 'chien'),
        row(3, 'cat ', 'matou'),
        row(4, 'bird', ''),
        row(5, '', ''),
        row(6, 'owl', 'hibou'),
      ],
      ['dog'],
    );

    expect(preview.rows.map((r) => [r.line, r.status, r.selected])).toEqual([
      [1, 'ok', true],
      [2, 'duplicate-existing', false],
      [3, 'duplicate-file', false],
      [4, 'invalid', false],
      [5, 'invalid', false],
      [6, 'ok', true],
    ]);
    expect(preview.counts).toEqual({
      ok: 2,
      'duplicate-existing': 1,
      'duplicate-file': 1,
      invalid: 2,
    });
  });

  it('une ligne invalide ne rend pas doublon la ligne valide suivante', () => {
    const preview = buildImportPreview([row(1, 'cat', ''), row(2, 'cat', 'chat')], []);
    expect(preview.rows.map((r) => r.status)).toEqual(['invalid', 'ok']);
  });

  it('nettoie les champs et interprète catégorie et genre', () => {
    const preview = buildImportPreview(
      [row(1, ' la  maison ', 'house', { partOfSpeech: 'Nom', gender: 'f', example: ' ' })],
      [],
    );
    expect(preview.rows[0]?.content).toMatchObject({
      term: 'la maison',
      translation: 'house',
      example: '',
      partOfSpeech: 'noun',
      gender: 'feminine',
    });
  });

  it('gère 200 lignes rapidement', () => {
    const rows = Array.from({ length: 200 }, (_, i) => row(i + 1, `word${i}`, `mot${i}`));
    const start = performance.now();
    const preview = buildImportPreview(rows, ['word5']);
    expect(performance.now() - start).toBeLessThan(100);
    expect(preview.counts.ok).toBe(199);
  });
});

describe('alias de catégorie et de genre', () => {
  it('accepte les clés internes et les libellés français', () => {
    expect(parsePartOfSpeech('verb')).toBe('verb');
    expect(parsePartOfSpeech('Adjectif')).toBe('adjective');
    expect(parsePartOfSpeech('préposition')).toBe('preposition');
    expect(parsePartOfSpeech('???')).toBe('');
    expect(parseGender('Féminin')).toBe('feminine');
    expect(parseGender('m.')).toBe('masculine');
    expect(parseGender('neuter')).toBe('neuter');
    expect(parseGender('')).toBe('');
  });
});
