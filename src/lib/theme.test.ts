import { applyTheme, isThemePreference, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('respecte un choix explicite quel que soit le système', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('suit le système en mode automatique', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('isThemePreference', () => {
  it('valide uniquement les valeurs connues', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('blue')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('applyTheme', () => {
  it('ajoute puis retire la classe dark', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.classList.contains('dark')).toBe(true);
    applyTheme('light', root);
    expect(root.classList.contains('dark')).toBe(false);
  });
});
