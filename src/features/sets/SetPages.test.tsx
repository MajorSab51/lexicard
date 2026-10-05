import { screen, waitFor, within } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

describe('liste des sets', () => {
  it('recherche et filtre par langue ou étiquette', async () => {
    await createSet(aSetInput({ title: 'Anglais : animaux', tags: ['B1'] }));
    await createSet(aSetInput({ title: 'Espagnol : verbes', sourceLang: 'es' }));
    const { user } = renderRoute('/sets');

    expect(await screen.findAllByRole('article')).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText('Langue'), 'Espagnol');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Espagnol : verbes' })).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Langue'), 'Toutes les langues');
    await user.selectOptions(screen.getByLabelText('Étiquette'), 'B1');
    expect(screen.getAllByRole('article')).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText('Étiquette'), 'Toutes les étiquettes');
    await user.type(screen.getByLabelText('Rechercher un set'), 'introuvable');
    expect(await screen.findByText('Aucun set ne correspond')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Effacer les filtres' }));
    expect(await screen.findAllByRole('article')).toHaveLength(2);
  });
});

describe('détail d’un set', () => {
  it('marque une carte favorite et difficile', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat')]);
    const { user } = renderRoute(`/sets/${set.id}`);

    await user.click(await screen.findByRole('button', { name: 'Favorite : cat' }));
    await user.click(screen.getByRole('button', { name: 'Difficile : cat' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Favorite : cat' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
    const [card] = await getSetCards(set.id);
    expect(card).toMatchObject({ favorite: true, difficult: true });
  });

  it('déplace des cartes sélectionnées vers un autre set', async () => {
    const set = await createSet(aSetInput({ title: 'Source' }), [
      aCard('cat', 'chat'),
      aCard('dog', 'chien'),
    ]);
    const target = await createSet(aSetInput({ title: 'Cible' }));
    const { user } = renderRoute(`/sets/${set.id}`);

    await user.click(await screen.findByRole('button', { name: 'Sélectionner' }));
    await user.click(screen.getByRole('checkbox', { name: 'Sélectionner dog' }));
    await user.click(screen.getByRole('button', { name: 'Déplacer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Déplacer vers un autre set' });
    expect(within(dialog).getByLabelText('Set de destination')).toHaveValue(target.id);
    await user.click(within(dialog).getByRole('button', { name: 'Déplacer' }));

    await waitFor(async () => {
      expect((await getSetCards(target.id)).map((card) => card.term)).toEqual(['dog']);
    });
    expect((await getSetCards(set.id)).map((card) => card.term)).toEqual(['cat']);
  });

  it('duplique puis supprime un set après confirmation', async () => {
    const set = await createSet(aSetInput({ title: 'Allemand' }), [aCard('Hund', 'chien')]);
    const { user, router } = renderRoute(`/sets/${set.id}`);

    await user.click(await screen.findByRole('button', { name: 'Dupliquer' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Allemand (copie)' }),
    ).toBeVisible();
    expect(await db.sets.count()).toBe(2);

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Supprimer ce set ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer le set' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/sets');
    });
    expect((await db.sets.toArray()).map((s) => s.title)).toEqual(['Allemand']);
  });

  it('affiche un message clair pour un set inexistant', async () => {
    renderRoute('/sets/inconnu');
    expect(await screen.findByRole('heading', { level: 1, name: 'Set introuvable' })).toBeVisible();
  });
});
