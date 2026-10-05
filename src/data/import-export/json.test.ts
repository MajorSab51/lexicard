import { aCard, aSetInput } from '@/test/factories';
import { getSetCards } from '../cardsRepository';
import { db } from '../db';
import { createSet } from '../setsRepository';
import { ImportError } from './errors';
import { exportSetJson } from './exporters';
import { commitImport, parseCardsSource } from './importer';
import { parseCardsJson } from './json';

describe('parseCardsJson', () => {
  it('lit un tableau simple, avec noms anglais ou français', () => {
    const result = parseCardsJson(
      JSON.stringify([
        { term: 'cat', translation: 'chat', example: 'A cat.' },
        { terme: 'perro', traduction: 'chien' },
        { term: 42, translation: 'quarante-deux' },
        'pas un objet',
      ]),
    );
    expect(result.setMeta).toBeUndefined();
    expect(result.rows).toEqual([
      { line: 1, fields: { term: 'cat', translation: 'chat', example: 'A cat.' } },
      { line: 2, fields: { term: 'perro', translation: 'chien' } },
      { line: 3, fields: { term: '42', translation: 'quarante-deux' } },
      { line: 4, fields: {} },
    ]);
  });

  it('relit un export de set avec ses métadonnées', async () => {
    const set = await createSet(aSetInput({ title: 'Allemand', sourceLang: 'de', tags: ['A1'] }), [
      aCard('der Hund', 'le chien', { gender: 'masculine', partOfSpeech: 'noun' }),
    ]);
    const file = await exportSetJson(set.id);
    expect(file.filename).toMatch(/^allemand-\d{4}-\d{2}-\d{2}\.json$/);

    const result = parseCardsJson(file.content);
    expect(result.setMeta).toMatchObject({ title: 'Allemand', sourceLang: 'de', tags: ['A1'] });
    expect(result.rows[0]?.fields).toMatchObject({
      term: 'der Hund',
      gender: 'masculine',
      partOfSpeech: 'noun',
    });
  });

  it('signale les formats non pris en charge', () => {
    const code = (text: string) => {
      try {
        parseCardsJson(text);
        return 'aucune erreur';
      } catch (error) {
        return error instanceof ImportError ? error.code : 'autre';
      }
    };
    expect(code('{pas du json')).toBe('invalidJson');
    expect(code('{"hello": 1}')).toBe('unsupportedFormat');
    expect(code('[]')).toBe('empty');
    expect(code('{"format":"lexicards.backup","version":1,"data":{}}')).toBe('isBackup');
    expect(code('{"format":"lexicards.set","version":99,"cards":[]}')).toBe('unsupportedVersion');
  });
});

describe('parseCardsSource', () => {
  it('choisit le format selon le nom de fichier ou le contenu', () => {
    expect(parseCardsSource('[{"term":"a","translation":"b"}]').format).toBe('json');
    expect(parseCardsSource('a,b', 'liste.csv').format).toBe('csv');
    expect(parseCardsSource('cat\tchat').format).toBe('csv');
  });

  it('refuse un texte vide', () => {
    expect(() => parseCardsSource('   ')).toThrow(ImportError);
  });
});

describe('commitImport', () => {
  it('ajoute à un set existant ou crée un nouveau set', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat')]);
    const existing = await commitImport({ kind: 'existing', setId: set.id }, [
      aCard('dog', 'chien'),
    ]);
    expect(existing).toEqual({ setId: set.id, added: 1 });
    expect((await getSetCards(set.id)).map((c) => c.term)).toEqual(['cat', 'dog']);

    const created = await commitImport({ kind: 'new', input: aSetInput({ title: 'Nouveau' }) }, [
      aCard('owl', 'hibou'),
    ]);
    expect((await db.sets.get(created.setId))?.title).toBe('Nouveau');
    expect(created.added).toBe(1);
  });
});
