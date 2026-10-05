import { screen, waitFor, within } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

describe("écran d'import", () => {
  it('importe un texte collé dans un set existant, sans les doublons', async () => {
    const set = await createSet(aSetInput({ title: 'Animaux' }), [aCard('cat', 'chat')]);
    const { user, router } = renderRoute(`/import?set=${set.id}`);

    await user.click(await screen.findByRole('radio', { name: 'Coller du texte' }));
    await user.click(screen.getByLabelText('Texte à importer'));
    await user.paste('cat;chat\ndog;chien\nbird;\nowl;hibou\nDOG;toutou');
    await user.click(screen.getByRole('button', { name: 'Analyser' }));

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').at(-1)?.textContent)).toEqual([
      'Déjà dans le set',
      'Nouvelle',
      'Incomplète',
      'Nouvelle',
      'Doublon dans le fichier',
    ]);

    await user.click(screen.getByRole('button', { name: 'Importer 2 cartes' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/sets/${set.id}`);
    });
    expect((await getSetCards(set.id)).map((card) => card.term)).toEqual(['cat', 'dog', 'owl']);
  });

  it('permet de cocher un doublon et crée un nouveau set', async () => {
    const { user, router } = renderRoute('/import');

    await user.click(await screen.findByRole('radio', { name: 'Coller du texte' }));
    await user.click(screen.getByLabelText('Texte à importer'));
    await user.paste('terme,traduction\nhouse,maison\nhouse,demeure');
    await user.click(screen.getByRole('button', { name: 'Analyser' }));

    await user.click(await screen.findByRole('checkbox', { name: 'Importer la ligne 3' }));
    await user.type(screen.getByLabelText('Titre du nouveau set'), 'Maison');
    await user.click(screen.getByRole('button', { name: 'Importer 2 cartes' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/^\/sets\/[\w-]+$/);
    });
    const [set] = await db.sets.toArray();
    expect(set?.title).toBe('Maison');
    expect((await getSetCards(set!.id)).map((card) => card.translation)).toEqual([
      'maison',
      'demeure',
    ]);
  });

  it('importe un fichier CSV de 200 lignes avec aperçu', async () => {
    const { user } = renderRoute('/import');
    const lines = Array.from({ length: 200 }, (_, i) => `word${i};mot${i};Example ${i}.`);
    const file = new File([lines.join('\n')], 'vocabulaire.csv', { type: 'text/csv' });

    await user.upload(await screen.findByLabelText('Fichier CSV ou JSON'), file);

    expect(await screen.findByText(/vocabulaire\.csv · 200 cartes/)).toBeVisible();
    expect(screen.getByLabelText('Titre du nouveau set')).toHaveValue('vocabulaire');
    await user.click(screen.getByRole('button', { name: 'Importer 200 cartes' }));
    await waitFor(async () => {
      expect(await db.cards.count()).toBe(200);
    });
  });

  it('explique pourquoi un fichier est refusé', async () => {
    const { user } = renderRoute('/import');
    const backup = new File(
      ['{"format":"lexicards.backup","version":1,"data":{}}'],
      'sauvegarde.json',
      { type: 'application/json' },
    );
    await user.upload(await screen.findByLabelText('Fichier CSV ou JSON'), backup);
    expect(await screen.findByRole('alert')).toHaveTextContent(/sauvegarde complète/);
  });
});
