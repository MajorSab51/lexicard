import { screen, waitFor, within } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

describe('éditeur de set', () => {
  it('crée un set entièrement au clavier (Tab entre les champs, Entrée pour une nouvelle carte)', async () => {
    const { user, router } = renderRoute('/sets/new');

    await user.type(await screen.findByLabelText('Titre'), 'Anglais : cuisine');
    await user.click(screen.getAllByLabelText(/^Terme/)[0]!);
    await user.keyboard('apple{Tab}pomme{Enter}');

    // Entrée a inséré une carte et placé le focus sur son terme.
    await waitFor(() => {
      expect(screen.getAllByLabelText(/^Terme/)[1]).toHaveFocus();
    });
    await user.keyboard('bread{Tab}pain{Tab}Fresh bread.{Enter}cheese{Tab}fromage');

    await user.click(screen.getAllByRole('button', { name: 'Enregistrer' }).at(-1)!);

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/sets\/[\w-]+$/);
    });
    const [set] = await db.sets.toArray();
    expect(set?.title).toBe('Anglais : cuisine');
    const cards = await getSetCards(set!.id);
    expect(cards.map((card) => [card.term, card.translation, card.example])).toEqual([
      ['apple', 'pomme', ''],
      ['bread', 'pain', 'Fresh bread.'],
      ['cheese', 'fromage', ''],
    ]);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anglais : cuisine' }),
    ).toBeVisible();
  });

  it('refuse d’enregistrer sans titre ou avec une carte incomplète', async () => {
    const { user } = renderRoute('/sets/new');
    await user.click((await screen.findAllByLabelText(/^Terme/))[0]!);
    await user.keyboard('lonely');
    await user.click(screen.getAllByRole('button', { name: 'Enregistrer' }).at(-1)!);

    expect(await screen.findByText('Le titre est obligatoire.')).toBeVisible();
    expect(screen.getByText('Terme et traduction obligatoires.')).toBeVisible();
    expect(await db.sets.count()).toBe(0);
  });

  it('signale les doublons et permet de réordonner avec Alt + flèche', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat'), aCard('dog', 'chien')]);
    const { user } = renderRoute(`/sets/${set.id}/edit`);

    const terms = await screen.findAllByLabelText(/^Terme/);
    await user.click(terms[1]!);
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    await waitFor(() => {
      expect(
        screen.getAllByLabelText(/^Terme/).map((input) => (input as HTMLInputElement).value),
      ).toEqual(['dog', 'cat']);
    });

    await user.clear(screen.getAllByLabelText(/^Terme/)[1]!);
    await user.type(screen.getAllByLabelText(/^Terme/)[1]!, 'Dog');
    expect(screen.getByText('Ce terme figure déjà dans une autre carte.')).toBeVisible();

    await user.click(screen.getAllByRole('button', { name: 'Enregistrer' }).at(-1)!);
    await waitFor(async () => {
      expect((await getSetCards(set.id)).map((card) => card.term)).toEqual(['dog', 'Dog']);
    });
  });

  it('demande confirmation avant de quitter avec des modifications non enregistrées', async () => {
    const set = await createSet(aSetInput({ title: 'Initial' }), [aCard('cat', 'chat')]);
    const { user, router } = renderRoute(`/sets/${set.id}/edit`);

    const title = await screen.findByLabelText('Titre');
    await user.type(title, ' modifié');
    await user.click(screen.getByRole('link', { name: 'Annuler' }));

    const dialog = await screen.findByRole('dialog', { name: 'Quitter sans enregistrer ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(router.state.location.pathname).toBe(`/sets/${set.id}/edit`);

    await user.click(screen.getByRole('link', { name: 'Annuler' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Quitter sans enregistrer ?' })).getByRole(
        'button',
        { name: 'Quitter' },
      ),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/sets/${set.id}`);
    });
    expect((await db.sets.get(set.id))?.title).toBe('Initial');
  });
});
