import { screen, waitFor, within } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet, touchSet } from '@/data/setsRepository';
import { saveSetting, SETTINGS } from '@/data/settingsRepository';
import { addDays, toLocalDay } from '@/domain/dates';
import type { CardProgress } from '@/domain/models';
import { applyReview } from '@/domain/srs';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

async function seedSet(title = 'Animaux', terms = ['cat', 'dog', 'owl']) {
  const set = await createSet(
    aSetInput({ title }),
    terms.map((term) => aCard(term, `${term}-fr`)),
  );
  return { set, cards: await getSetCards(set.id) };
}

/** Carte déjà étudiée deux fois, prévue il y a `daysAgo` jours (intervalle de 6 jours). */
async function makeDue(cardId: string, daysAgo = 0) {
  const progress: CardProgress = {
    ...applyReview(undefined, cardId, 'good', new Date(2026, 0, 1)),
    interval: 6,
    repetitions: 2,
    dueDate: addDays(toLocalDay(new Date()), -daysAgo),
    introducedOn: '2026-01-01',
  };
  await db.progress.put(progress);
}

const counter = (name: RegExp) =>
  within(screen.getByRole('list', { name: 'Cartes restantes' })).getByText(name);
const announced = () => screen.getByText(/^(Carte|Réponse) : /).textContent;

describe('mode Apprendre', () => {
  it('note les cartes au clavier et remet les cartes ratées en fin de session', async () => {
    const { set, cards } = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/learn`);

    expect(await screen.findByText('cat')).toBeVisible();
    expect(counter(/Nouvelles/)).toHaveTextContent('Nouvelles3');
    expect(screen.queryByText('cat-fr')).toBeNull();

    await user.keyboard(' ');
    expect(screen.getByText('cat-fr')).toBeVisible();
    expect(announced()).toBe('Réponse : cat-fr');
    await user.keyboard('3');
    expect(announced()).toBe('Carte : dog');

    // Les notes ne sont acceptées qu'une fois la réponse affichée.
    await user.keyboard('4');
    expect(announced()).toBe('Carte : dog');
    await user.keyboard(' 1');
    expect(counter(/À revoir/)).toHaveTextContent('À revoir1');
    await user.keyboard(' 4');
    expect(announced()).toBe('Carte : dog');
    expect(screen.getByText('À revoir', { selector: 'span' })).toBeVisible();
    await user.keyboard(' 2');

    expect(await screen.findByText('Session terminée !')).toBeVisible();
    expect(screen.getByText('3 cartes étudiées.')).toBeVisible();
    // Seule la première réponse de chaque carte compte : dog a été raté avant d'être retrouvé.
    const results = screen.getByLabelText('Résultats');
    const tally = (grade: string) => within(results).getByText(grade).nextSibling?.textContent;
    expect(['Raté', 'Difficile', 'Bien', 'Facile'].map(tally)).toEqual(['1', '0', '1', '1']);
    expect(await screen.findByText('Prochaine révision : demain.')).toBeVisible();

    await waitFor(async () => {
      expect(await db.reviewLogs.count()).toBe(4);
    });
    const dog = await db.progress.get(cards[1]!.id);
    // La carte ratée garde la planification de sa première réponse (demain, répétitions à zéro).
    expect(dog).toMatchObject({ repetitions: 0, interval: 1, easeFactor: 1.96 });
    expect(await db.progress.get(cards[2]!.id)).toMatchObject({ easeFactor: 2.6 });
  });

  it('se pilote aussi à la souris et déplace le focus vers les notes', async () => {
    const { set } = await seedSet('Animaux', ['cat']);
    const { user } = renderRoute(`/sets/${set.id}/learn`);

    await user.click(await screen.findByRole('button', { name: 'Afficher la réponse' }));
    expect(screen.getByRole('group', { name: 'Évalue ta réponse' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Bien' }));
    expect(await screen.findByText('Session terminée !')).toBeVisible();
    expect(screen.getByText('1 carte étudiée.')).toBeVisible();
  });

  it('révise les cartes dues avant les nouvelles et replanifie selon SM-2', async () => {
    const { set, cards } = await seedSet();
    await makeDue(cards[2]!.id, 3);
    const { user } = renderRoute(`/sets/${set.id}/learn`);

    expect(await screen.findByText('owl')).toBeVisible();
    expect(screen.getByText('Révision')).toBeVisible();
    expect(counter(/À réviser/)).toHaveTextContent('À réviser1');
    expect(counter(/Nouvelles/)).toHaveTextContent('Nouvelles2');

    await user.keyboard(' 3');
    await waitFor(async () => {
      expect(await db.progress.get(cards[2]!.id)).toMatchObject({
        interval: 15,
        repetitions: 3,
        dueDate: addDays(toLocalDay(new Date()), 15),
      });
    });
    expect(announced()).toBe('Carte : cat');
  });

  it('respecte la limite de nouvelles cartes par jour', async () => {
    const { set } = await seedSet();
    await saveSetting(SETTINGS.newCardsPerDay, 2);
    const { user, unmount } = renderRoute(`/sets/${set.id}/learn`);

    expect(await screen.findByText('cat')).toBeVisible();
    expect(counter(/Nouvelles/)).toHaveTextContent('Nouvelles2');
    await user.keyboard(' 3 3');
    expect(await screen.findByText('Session terminée !')).toBeVisible();
    unmount();

    renderRoute(`/sets/${set.id}/learn`);
    expect(await screen.findByText('Rien à réviser pour le moment')).toBeVisible();
    expect(screen.getByText('Prochaine révision : demain.')).toBeVisible();
    expect(screen.getByText(/Limite de 2 nouvelles cartes par jour atteinte/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Modifier la limite' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('« Tout réviser » parcourt tous les sets avec une limite commune', async () => {
    const english = await seedSet('Anglais', ['cat', 'dog']);
    const spanish = await seedSet('Espagnol', ['gato', 'perro']);
    await touchSet(english.set.id, '2099-01-01T00:00:00.000Z');
    await makeDue(spanish.cards[1]!.id);
    await saveSetting(SETTINGS.newCardsPerDay, 3);
    const { user } = renderRoute('/learn');

    expect(await screen.findByText('perro')).toBeVisible();
    expect(screen.getByText('· Espagnol')).toBeVisible();
    await user.keyboard(' 3');
    // Nouvelles cartes : le set modifié le plus récemment d'abord.
    for (const term of ['cat', 'dog', 'gato']) {
      expect(announced()).toBe(`Carte : ${term}`);
      await user.keyboard(' 3');
    }
    expect(await screen.findByText('4 cartes étudiées.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/');
  });

  it('signale un set vide', async () => {
    const set = await createSet(aSetInput());
    renderRoute(`/sets/${set.id}/learn`);
    expect(await screen.findByText('Ce set est vide')).toBeVisible();
  });
});

describe('compteurs', () => {
  it('affiche la révision du jour sur l’accueil', async () => {
    const { cards } = await seedSet();
    await makeDue(cards[0]!.id);
    renderRoute('/');

    const panel = await screen.findByRole('region', { name: 'Révision du jour' });
    expect(within(panel).getByText('À réviser aujourd’hui').nextSibling).toHaveTextContent('1');
    expect(within(panel).getByText('Nouvelles aujourd’hui').nextSibling).toHaveTextContent('2');
    expect(within(panel).getByText('Maîtrisées').nextSibling).toHaveTextContent('0');
    expect(within(panel).getByRole('link', { name: 'Tout réviser' })).toHaveAttribute(
      'href',
      '/learn',
    );
  });

  it('indique sur l’accueil que tout est à jour', async () => {
    const { cards } = await seedSet('Animaux', ['cat']);
    await db.progress.put(applyReview(undefined, cards[0]!.id, 'good', new Date()));
    renderRoute('/');

    const panel = await screen.findByRole('region', { name: 'Révision du jour' });
    expect(
      within(panel).getByText('Tout est à jour pour aujourd’hui. Prochaine révision : demain.'),
    ).toBeVisible();
    expect(within(panel).queryByRole('link', { name: 'Tout réviser' })).toBeNull();
  });

  it('affiche la répartition des cartes sur la page du set', async () => {
    const { set, cards } = await seedSet();
    await makeDue(cards[0]!.id);
    await db.progress.put({
      ...applyReview(undefined, cards[1]!.id, 'good', new Date()),
      interval: 30,
      status: 'mastered',
    });
    renderRoute(`/sets/${set.id}`);

    const study = await screen.findByRole('region', { name: 'Étudier' });
    const tile = async (label: string) => (await within(study).findByText(label)).nextSibling;
    expect(await tile('À réviser aujourd’hui')).toHaveTextContent('1');
    expect(await tile('Nouvelles')).toHaveTextContent('1');
    expect(await tile('En cours')).toHaveTextContent('1');
    expect(await tile('Maîtrisées')).toHaveTextContent('1');
  });
});

describe('réglage des nouvelles cartes', () => {
  it('enregistre une limite valide et signale une valeur invalide', async () => {
    const { user } = renderRoute('/settings');
    const field = await screen.findByLabelText('Nouvelles cartes par jour');
    expect(field).toHaveValue(10);

    await user.clear(field);
    await user.type(field, '25');
    await waitFor(async () => {
      expect((await db.settings.get('srs.newCardsPerDay'))?.value).toBe(25);
    });

    await user.clear(field);
    await user.type(field, '500');
    expect(screen.getByText('Choisis un nombre entier entre 0 et 200.')).toBeVisible();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    // Chaque valeur valide est enregistrée à la frappe : « 50 » l'a été avant « 500 ».
    await user.tab();
    expect(field).toHaveValue(50);
    expect(screen.queryByText('Choisis un nombre entier entre 0 et 200.')).toBeNull();
  });
});
