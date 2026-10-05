import { screen } from '@testing-library/react';
import { useThemeStore } from '@/features/settings/themeStore';
import { renderRoute } from '@/test/renderRoute';

beforeEach(() => {
  useThemeStore.setState({ preference: 'system' });
});

describe('application', () => {
  it("affiche l'accueil avec la navigation principale", async () => {
    renderRoute('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bienvenue sur LexiCards' }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigue vers les paramètres et applique le thème sombre', async () => {
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('link', { name: 'Paramètres' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Paramètres' })).toBeVisible();

    await user.click(screen.getByRole('radio', { name: 'Sombre' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('lexicards.theme')).toContain('"preference":"dark"');

    await user.click(screen.getByRole('radio', { name: 'Clair' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it("ouvre un mode d'étude en plein écran avec un bouton de sortie", async () => {
    renderRoute('/sets/abc/flashcards');
    expect(await screen.findByRole('link', { name: 'Quitter la session' })).toHaveAttribute(
      'href',
      '/sets/abc',
    );
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).toBeNull();
  });

  it('affiche une page 404 pour une adresse inconnue', async () => {
    renderRoute('/nulle-part');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page introuvable' }),
    ).toBeInTheDocument();
  });
});
