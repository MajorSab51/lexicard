import { fireEvent, screen, waitFor } from '@testing-library/react';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';
import { installSpeechMock, mockVoice } from '@/test/speechMock';

describe('réglages audio', () => {
  let speech: ReturnType<typeof installSpeechMock>;
  beforeEach(() => {
    speech = installSpeechMock({
      voices: [
        mockVoice('Hazel', 'en-GB'),
        mockVoice('Zira', 'en-US'),
        mockVoice('Google español', 'es-ES', false),
      ],
    });
  });
  afterEach(() => {
    speech.uninstall();
  });

  it('propose les voix des langues des sets et retient le choix', async () => {
    const set = await createSet(aSetInput({ sourceLang: 'en', targetLang: 'es' }), [
      aCard('cat', 'gato'),
    ]);
    const { user } = renderRoute('/settings');

    const english = await screen.findByLabelText('Anglais');
    expect(screen.getByLabelText('Espagnol')).toHaveTextContent('Google español (en ligne)');
    expect(screen.queryByLabelText('Français')).toBeNull();

    await user.selectOptions(english, 'Zira');
    await waitFor(async () => {
      expect((await db.settings.get('speech.voices'))?.value).toEqual({ en: 'Zira' });
    });

    fireEvent.change(screen.getByLabelText('Vitesse de lecture'), { target: { value: '0.7' } });
    await waitFor(async () => {
      expect((await db.settings.get('speech.rate'))?.value).toBe(0.7);
    });

    await user.click(screen.getByRole('button', { name: 'Tester la voix : Anglais' }));
    await waitFor(() => {
      expect(speech.spoken.at(-1)).toMatchObject({ text: 'English', rate: 0.7 });
    });
    expect(speech.spoken.at(-1)?.voice?.name).toBe('Zira');

    // La voix choisie est aussi celle des cartes.
    renderRoute(`/sets/${set.id}/flashcards`);
    await user.click(await screen.findByRole('button', { name: 'Écouter « cat »' }));
    await waitFor(() => {
      expect(speech.spoken.at(-1)?.voice?.name).toBe('Zira');
    });
  });

  it('indique quand une langue n’a aucune voix', async () => {
    await createSet(aSetInput({ sourceLang: 'de', targetLang: 'fr' }));
    renderRoute('/settings');
    expect(await screen.findByLabelText('Allemand')).toBeDisabled();
    expect(
      screen.getAllByText('Aucune voix installée pour cette langue sur cet appareil.'),
    ).toHaveLength(2);
  });
});
