import {
  classifyDuplicates,
  cleanImageUrl,
  findDuplicateIndices,
  isBlankCard,
  isCompleteCard,
  parseTags,
  sanitizeCardContent,
} from './cards';
import { cleanText, stripDiacritics, termKey } from './text';

describe('texte', () => {
  it('retire les accents', () => {
    expect(stripDiacritics('Été, garçon, niño, Über')).toBe('Ete, garcon, nino, Uber');
  });

  it('nettoie les espaces', () => {
    expect(cleanText('  to   run \n fast ')).toBe('to run fast');
  });

  it('compare les termes sans casse mais avec accents', () => {
    expect(termKey(' The  Apple ')).toBe(termKey('the apple'));
    expect(termKey('pêche')).not.toBe(termKey('pèche'));
  });
});

describe('sanitizeCardContent', () => {
  it('nettoie les champs et complète les valeurs absentes', () => {
    expect(sanitizeCardContent({ term: '  dog ', translation: 'chien  ' })).toEqual({
      term: 'dog',
      translation: 'chien',
      example: '',
      note: '',
      imageUrl: '',
      partOfSpeech: '',
      gender: '',
    });
  });

  it('rejette une catégorie ou un genre inconnus', () => {
    const content = sanitizeCardContent({
      term: 'a',
      translation: 'b',
      partOfSpeech: 'verbe' as never,
      gender: 'masculine',
    });
    expect(content.partOfSpeech).toBe('');
    expect(content.gender).toBe('masculine');
  });
});

describe('cleanImageUrl', () => {
  it('accepte uniquement les liens http et https', () => {
    expect(cleanImageUrl(' https://example.org/a.png ')).toBe('https://example.org/a.png');
    expect(cleanImageUrl('javascript:alert(1)')).toBe('');
    expect(cleanImageUrl('pas une url')).toBe('');
    expect(cleanImageUrl('')).toBe('');
  });
});

describe('validité des cartes', () => {
  it('distingue carte vide, incomplète et complète', () => {
    expect(isBlankCard({ term: ' ', translation: '' })).toBe(true);
    expect(isCompleteCard({ term: 'cat', translation: '' })).toBe(false);
    expect(isBlankCard({ term: 'cat', translation: '' })).toBe(false);
    expect(isCompleteCard({ term: 'cat', translation: 'chat' })).toBe(true);
  });
});

describe('doublons', () => {
  it('signale les répétitions après la première occurrence', () => {
    expect([...findDuplicateIndices(['cat', 'dog', 'Cat ', '', '', 'dog'])]).toEqual([2, 5]);
  });

  it('distingue les doublons du set et ceux du fichier', () => {
    expect(classifyDuplicates(['cat', 'bird', 'BIRD', 'dog', ''], ['dog', 'Cat'])).toEqual([
      'existing',
      'none',
      'file',
      'existing',
      'none',
    ]);
  });
});

describe('parseTags', () => {
  it('découpe sur virgules et points-virgules sans doublons', () => {
    expect(parseTags(' voyage, B1 ; verbes,, Voyage ')).toEqual(['voyage', 'B1', 'verbes']);
  });
});
