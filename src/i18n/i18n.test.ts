import { formatRelativeDays, formatSeconds, t } from './index';

describe('t', () => {
  it('retourne le texte français d’une clé imbriquée', () => {
    expect(t('nav.home')).toBe('Accueil');
    expect(t('settings.themeOptions.system')).toBe('Automatique');
  });

  it('remplace les variables connues et laisse les autres intactes', () => {
    expect(t('settings.newCardsInvalid', { min: 0, max: 200 })).toBe(
      'Choisis un nombre entier entre 0 et 200.',
    );
    expect(t('settings.newCardsInvalid', { min: 0 })).toBe(
      'Choisis un nombre entier entre 0 et {max}.',
    );
  });
});

describe('formatRelativeDays', () => {
  it('formule les écarts de jours en langage courant', () => {
    expect(formatRelativeDays(0)).toBe('aujourd’hui');
    expect(formatRelativeDays(1)).toBe('demain');
    expect(formatRelativeDays(6)).toBe('dans 6 jours');
  });
});

describe('formatSeconds', () => {
  it('affiche les dixièmes de seconde', () => {
    // Intl sépare le nombre et l’unité par une espace fine insécable.
    expect(formatSeconds(12_345)).toBe('12,3\u202Fs');
    expect(formatSeconds(900)).toBe('0,9\u202Fs');
  });
});
