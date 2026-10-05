import { t } from './index';

describe('t', () => {
  it('retourne le texte français d’une clé imbriquée', () => {
    expect(t('nav.home')).toBe('Accueil');
    expect(t('settings.themeOptions.system')).toBe('Automatique');
  });

  it('remplace les variables connues et laisse les autres intactes', () => {
    expect(t('common.comingSoon', { milestone: 'jalon 2' })).toBe(
      'Cet écran sera disponible au jalon 2.',
    );
    expect(t('common.comingSoon')).toBe('Cet écran sera disponible au {milestone}.');
  });
});
