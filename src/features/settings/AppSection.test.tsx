import { screen, within } from '@testing-library/react';
import { useInstallStore, type BeforeInstallPromptEvent } from '@/lib/install';
import { renderRoute } from '@/test/renderRoute';

async function appSection() {
  return screen.findByRole('region', { name: 'Application' });
}

describe('paramètres : application', () => {
  afterEach(() => {
    useInstallStore.setState({ deferred: null, installed: false });
  });

  it('explique comment installer sans proposition du navigateur, et donne la version', async () => {
    renderRoute('/settings');
    const section = await appSection();

    expect(section).toHaveTextContent('utilise le menu de ton navigateur');
    // jsdom, comme un site servi sans HTTPS, n'a pas de service worker.
    expect(section).toHaveTextContent('Ce navigateur ne permet pas l’usage hors ligne.');
    expect(section).toHaveTextContent(`Version ${__APP_VERSION__}`);
  });

  it('ouvre la fenêtre d’installation du navigateur', async () => {
    const prompt = vi.fn(() => Promise.resolve());
    const deferred = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }) satisfies BeforeInstallPromptEvent;
    useInstallStore.setState({ deferred });
    const { user } = renderRoute('/settings');

    await user.click(
      within(await appSection()).getByRole('button', { name: 'Installer l’application' }),
    );
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('indique que l’application est installée', async () => {
    useInstallStore.setState({ installed: true });
    renderRoute('/settings');
    expect(await appSection()).toHaveTextContent('LexiCards est installée sur cet appareil.');
  });

  it('propose la langue de l’interface', async () => {
    renderRoute('/settings');
    const language = await screen.findByLabelText('Langue de l’interface');
    expect(language).toHaveValue('fr');
    expect(
      within(language)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Français']);
  });
});
