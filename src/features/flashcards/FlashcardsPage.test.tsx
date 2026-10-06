import { fireEvent, screen, waitFor } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';
import { installSpeechMock, mockVoice } from '@/test/speechMock';

async function seedSet(overrides = {}) {
  return createSet(aSetInput({ title: 'Animaux', ...overrides }), [
    aCard('cat', 'chat', { example: 'The cat sleeps.' }),
    aCard('dog', 'chien'),
    aCard('owl', 'hibou'),
  ]);
}

/** Texte annoncé aux lecteurs d'écran : reflète la face visible. */
const announced = () => screen.getByText(/^(Recto|Verso) : /).textContent;

describe('mode Cartes mémoire', () => {
  it('retourne avec Espace, avance avec les flèches et termine la série', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);

    expect(await screen.findByText('Carte 1 sur 3')).toBeVisible();
    expect(announced()).toBe('Recto : cat');

    await user.keyboard(' ');
    expect(announced()).toBe('Verso : chat');
    expect(screen.getByText('The cat sleeps.')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('Carte 2 sur 3')).toBeVisible();
    expect(announced()).toBe('Recto : dog');
    await user.keyboard('{ArrowLeft}');
    expect(announced()).toBe('Recto : cat');

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(await screen.findByText('Bravo, tu as parcouru toutes les cartes !')).toBeVisible();
    expect(screen.getByText('3 cartes revues.')).toBeVisible();
  });

  it('enregistre une consultation par carte au premier retournement', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);
    await screen.findByText('Carte 1 sur 3');

    await user.keyboard('   ');
    await waitFor(async () => {
      expect(await db.reviewLogs.count()).toBe(1);
    });
    const [log] = await db.reviewLogs.toArray();
    expect(log).toMatchObject({ setId: set.id, mode: 'flashcards', result: 'seen' });
  });

  it('retourne la carte au clic et change de carte par balayage', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);
    const card = await screen.findByRole('button', { name: 'Retourner la carte' });

    await user.click(card);
    expect(announced()).toBe('Verso : chat');

    fireEvent.pointerDown(card, { pointerId: 1, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 150, clientY: 205 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 150, clientY: 205 });
    fireEvent.click(card);
    expect(screen.getByText('Carte 2 sur 3')).toBeVisible();
    // Le clic qui suit le balayage ne retourne pas la nouvelle carte.
    expect(announced()).toBe('Recto : dog');

    fireEvent.pointerDown(card, { pointerId: 2, clientX: 100, clientY: 200 });
    fireEvent.pointerUp(card, { pointerId: 2, clientX: 260, clientY: 190 });
    expect(screen.getByText('Carte 1 sur 3')).toBeVisible();
  });

  it('marque une carte difficile puis propose de revoir les cartes difficiles', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);
    await screen.findByText('Carte 1 sur 3');

    await user.keyboard('{ArrowRight}');
    await user.click(screen.getByRole('button', { name: 'Difficile' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Difficile' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
    expect((await getSetCards(set.id)).find((card) => card.term === 'dog')?.difficult).toBe(true);

    await user.keyboard('{ArrowRight}{ArrowRight}');
    await user.click(await screen.findByRole('button', { name: 'Revoir la carte difficile' }));
    expect(await screen.findByText('Carte 1 sur 1')).toBeVisible();
    expect(announced()).toBe('Recto : dog');
  });

  it('inverse le sens et retient les options', async () => {
    const set = await seedSet();
    const { user, unmount } = renderRoute(`/sets/${set.id}/flashcards`);
    await screen.findByText('Carte 1 sur 3');

    await user.click(screen.getByText('Options'));
    await user.click(screen.getByRole('radio', { name: 'Traduction → terme' }));
    expect(announced()).toBe('Recto : chat');
    await waitFor(async () => {
      expect((await db.settings.get('flashcards.options'))?.value).toMatchObject({
        reversed: true,
      });
    });

    unmount();
    renderRoute(`/sets/${set.id}/flashcards`);
    await screen.findByText('Carte 1 sur 3');
    expect(announced()).toBe('Recto : chat');
  });

  it('explique qu’aucune carte n’est difficile quand le filtre est actif', async () => {
    const set = await seedSet();
    await db.settings.put({
      key: 'flashcards.options',
      value: { reversed: false, shuffle: false, onlyDifficult: true },
    });
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);

    expect(await screen.findByText('Aucune carte difficile')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Afficher toutes les cartes' }));
    expect(await screen.findByText('Carte 1 sur 3')).toBeVisible();
  });
});

describe('audio', () => {
  let speech: ReturnType<typeof installSpeechMock> | null = null;
  afterEach(() => {
    speech?.uninstall();
    speech = null;
  });

  it('prononce le recto avec une voix de la langue du set', async () => {
    speech = installSpeechMock({
      voices: [mockVoice('Helena', 'es-ES'), mockVoice('Hazel', 'en-GB')],
    });
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);

    await user.click(await screen.findByRole('button', { name: 'Écouter « cat »' }));
    await waitFor(() => {
      expect(speech?.spoken).toHaveLength(1);
    });
    expect(speech.spoken[0]).toMatchObject({ text: 'cat', lang: 'en-GB' });
    expect(speech.spoken[0]?.voice?.name).toBe('Hazel');
  });

  it('affiche un message explicite quand aucune voix ne parle la langue', async () => {
    speech = installSpeechMock({ voices: [mockVoice('Hazel', 'en-GB')] });
    const set = await seedSet({ sourceLang: 'ja' });
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);

    await user.click(await screen.findByRole('button', { name: 'Écouter « cat »' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Aucune voix en japonais n'est installée sur cet appareil.",
    );
    expect(speech.synth.speak).not.toHaveBeenCalled();
  });

  it('signale un navigateur sans synthèse vocale', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/flashcards`);
    await user.click(await screen.findByRole('button', { name: 'Écouter « cat »' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce navigateur ne propose pas la synthèse vocale.',
    );
  });
});
