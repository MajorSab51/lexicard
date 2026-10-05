import { aCard } from '@/test/factories';
import { cardsToCsv, parseCardsCsv } from './csv';
import { decodeText } from './decode';
import { ImportError } from './errors';

const terms = (text: string) =>
  parseCardsCsv(text).rows.map((row) => [row.fields.term, row.fields.translation]);

describe('parseCardsCsv', () => {
  it('lit le format documenté terme,traduction,exemple sans en-tête', () => {
    const result = parseCardsCsv('cat,chat,The cat sleeps.\ndog,chien\n');
    expect(result.hasHeader).toBe(false);
    expect(result.rows).toEqual([
      { line: 1, fields: { term: 'cat', translation: 'chat', example: 'The cat sleeps.' } },
      { line: 2, fields: { term: 'dog', translation: 'chien' } },
    ]);
  });

  it('détecte le point-virgule (Excel en français) et la tabulation', () => {
    expect(terms('chat;cat\nchien;dog')).toEqual([
      ['chat', 'cat'],
      ['chien', 'dog'],
    ]);
    expect(parseCardsCsv('chat;cat\nchien;dog').delimiter).toBe(';');
    expect(terms('cat\tchat\ndog\tchien')).toEqual([
      ['cat', 'chat'],
      ['dog', 'chien'],
    ]);
  });

  it('reconnaît un en-tête, dans n’importe quel ordre de colonnes', () => {
    const result = parseCardsCsv('Traduction,Terme,Genre,Inconnue\nchat,gato,M,x\n');
    expect(result.hasHeader).toBe(true);
    expect(result.rows).toEqual([
      { line: 2, fields: { translation: 'chat', term: 'gato', gender: 'M' } },
    ]);
  });

  it('ne prend pas une vraie carte pour un en-tête', () => {
    expect(parseCardsCsv('word,mot\nhouse,maison').hasHeader).toBe(false);
  });

  it('gère guillemets, virgules et retours à la ligne dans les cellules', () => {
    const result = parseCardsCsv('"to run, to jog",courir\n"say ""hi""","dire\nbonjour"');
    expect(result.rows.map((r) => r.fields)).toEqual([
      { term: 'to run, to jog', translation: 'courir' },
      { term: 'say "hi"', translation: 'dire\nbonjour' },
    ]);
  });

  it('ignore les lignes vides et conserve les numéros de ligne', () => {
    const result = parseCardsCsv('cat,chat\n\n , \ndog,chien\r\n');
    expect(result.rows.map((r) => r.line)).toEqual([1, 4]);
  });

  it('signale un fichier vide ou à une seule colonne', () => {
    expect(() => parseCardsCsv('\n\n')).toThrow(ImportError);
    expect(() => parseCardsCsv('cat\ndog')).toThrow(
      expect.objectContaining({ code: 'tooFewColumns' }),
    );
  });
});

describe('cardsToCsv', () => {
  it('écrit un en-tête relisible et échappe correctement', () => {
    const csv = cardsToCsv([
      { content: aCard('to run, fast', 'courir', { example: 'He said "go"' }) },
      { content: aCard('=SUM(A1)', 'formule', { gender: 'feminine' }) },
    ]);
    expect(csv.split('\r\n')[0]).toBe('terme,traduction,exemple,note,image,categorie,genre');
    expect(csv).toContain('"to run, fast",courir,"He said ""go"""');
    expect(csv).toContain("'=SUM(A1)");
  });

  it('fait un aller-retour sans perte', () => {
    const cards = [
      aCard('la maison', 'house', { example: 'Ma maison, ta maison', partOfSpeech: 'noun' }),
      aCard('+1', 'plus un', { note: 'ligne 1\nligne 2', gender: 'feminine' }),
      aCard('-tion', 'suffixe'),
    ];
    const parsed = parseCardsCsv(cardsToCsv(cards.map((content) => ({ content }))));
    expect(parsed.hasHeader).toBe(true);
    expect(parsed.rows.map((r) => r.fields)).toEqual(cards.map((card) => ({ ...card })));
  });

  it('ajoute la colonne set pour l’export global', () => {
    const csv = cardsToCsv([{ setTitle: 'Anglais', content: aCard('cat', 'chat') }], true);
    expect(csv.split('\r\n')).toEqual([
      'set,terme,traduction,exemple,note,image,categorie,genre',
      'Anglais,cat,chat,,,,,',
    ]);
  });
});

describe('decodeText', () => {
  it('lit l’UTF-8 et retire le BOM', () => {
    const bytes = new TextEncoder().encode('\uFEFFété,summer');
    expect(decodeText(bytes)).toBe('été,summer');
  });

  it('se replie sur Windows-1252 pour les exports Excel', () => {
    // « été » encodé en Windows-1252 : 0xE9 74 0xE9
    const bytes = new Uint8Array([0xe9, 0x74, 0xe9, 0x2c, 0x73]);
    expect(decodeText(bytes)).toBe('été,s');
  });
});
