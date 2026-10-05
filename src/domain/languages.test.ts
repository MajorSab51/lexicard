import { isKnownLanguage, languageName } from './languages';

describe('languageName', () => {
  it('donne le nom français avec une majuscule', () => {
    expect(languageName('en')).toBe('Anglais');
    expect(languageName('es')).toBe('Espagnol');
    expect(languageName('de')).toBe('Allemand');
  });

  it('retourne le code quand la langue est inconnue', () => {
    expect(languageName('zz-invalide-')).toBe('zz-invalide-');
  });
});

describe('isKnownLanguage', () => {
  it('reconnaît les langues proposées', () => {
    expect(isKnownLanguage('fr')).toBe(true);
    expect(isKnownLanguage('xx')).toBe(false);
  });
});
