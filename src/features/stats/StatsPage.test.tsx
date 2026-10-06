import { screen, waitFor, within } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { addDays, toLocalDay } from '@/domain/dates';
import type { ReviewLog, ReviewResult } from '@/domain/models';
import { applyReview } from '@/domain/srs';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

const today = toLocalDay(new Date());

/** Révision d'une carte, `daysAgo` jours avant aujourd'hui, à midi. */
function review(
  cardId: string,
  setId: string,
  daysAgo: number,
  result: ReviewResult = 'good',
  index = 0,
): ReviewLog {
  const [year = 0, month = 1, day = 1] = addDays(today, -daysAgo).split('-').map(Number);
  return {
    id: `${cardId}-${String(daysAgo)}-${String(index)}`,
    userId: null,
    cardId,
    setId,
    mode: 'learn',
    result,
    durationMs: 30_000,
    reviewedAt: new Date(year, month - 1, day, 12, index).toISOString(),
  };
}

async function seed() {
  const set = await createSet(aSetInput({ title: 'Animaux' }), [
    aCard('cat', 'chat'),
    aCard('dog', 'chien'),
    aCard('owl', 'hibou'),
  ]);
  const [cat, dog] = await getSetCards(set.id);
  await db.reviewLogs.bulkAdd([
    review(cat!.id, set.id, 0, 'good'),
    review(dog!.id, set.id, 0, 'again', 1),
    review(dog!.id, set.id, 0, 'again', 2),
    review(dog!.id, set.id, 1, 'good'),
    review(cat!.id, set.id, 5, 'easy'),
  ]);
  await db.progress.bulkPut([
    { ...applyReview(undefined, cat!.id, 'good', new Date()), interval: 30, status: 'mastered' },
    applyReview(undefined, dog!.id, 'again', new Date()),
  ]);
  return { set, cat: cat!, dog: dog! };
}

const tile = (label: string) => screen.getByText(label, { selector: 'dt' }).parentElement!;

// Recharts est lourd à charger dans jsdom : la page est importée une fois avant les tests.
beforeAll(async () => {
  await import('./StatsPage');
}, 30_000);

describe('page Statistiques', () => {
  it('invite à créer un set quand il n’y a rien à montrer', async () => {
    renderRoute('/stats');
    expect(await screen.findByText('Pas encore de statistiques')).toBeVisible();
  });

  it('affiche la série, l’objectif, la réussite et l’activité de la période', async () => {
    await seed();
    renderRoute('/stats');

    await screen.findByRole('heading', { name: 'Cartes étudiées par jour' });
    expect(tile('Série actuelle')).toHaveTextContent('2 jours');
    expect(tile('Série actuelle')).toHaveTextContent('Journée validée. Record : 2 jours');
    expect(tile('Objectif du jour')).toHaveTextContent('2 sur 20 cartes');
    expect(screen.getByRole('meter', { name: 'Objectif du jour' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    );
    // 5 réponses notées, 2 « Raté ».
    expect(tile('Taux de réussite')).toHaveTextContent('60 %');
    expect(tile('Taux de réussite')).toHaveTextContent('Sur 5 réponses notées.');
    expect(tile('Cartes étudiées')).toHaveTextContent('4');

    const table = screen.getByRole('table', { name: 'Cartes étudiées par jour' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(31); // en-tête + 30 jours
    // Aujourd'hui : 2 cartes, 3 réponses, 1 min 30 s arrondie à 2 min.
    expect(
      within(rows[1]!)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['2', '3', '2']);
  });

  it('change de période', async () => {
    await seed();
    const { user } = renderRoute('/stats');
    await user.click(await screen.findByRole('radio', { name: '7 jours' }));
    await waitFor(() => {
      const table = screen.getByRole('table', { name: 'Cartes étudiées par jour' });
      expect(within(table).getAllByRole('row')).toHaveLength(8);
    });
  });

  it('montre la répartition des cartes et la progression de chaque set', async () => {
    await seed();
    renderRoute('/stats');

    const levels = await screen.findByRole('region', { name: 'Répartition des cartes' });
    expect(within(levels).getByRole('img')).toHaveAccessibleName(
      '1 nouvelles, 1 en cours, 1 maîtrisées',
    );
    const sets = screen.getByRole('region', { name: 'Progression par set' });
    expect(within(sets).getByRole('link', { name: 'Animaux' })).toBeVisible();
    expect(within(sets).getByText(/3 cartes · 33 %\s?maîtrisées/)).toBeVisible();
  });
});

describe('progression ailleurs dans l’application', () => {
  it('affiche la série et l’objectif sur l’accueil', async () => {
    await seed();
    renderRoute('/');
    const panel = await screen.findByRole('region', { name: 'Révision du jour' });
    await waitFor(() => {
      expect(within(panel).getByText('Série').parentElement).toHaveTextContent('2 jours');
    });
    expect(within(panel).getByText('Objectif du jour').parentElement).toHaveTextContent(
      '2 sur 20 cartes',
    );
  });

  it('classe les cartes les plus difficiles sur la page du set', async () => {
    const { set } = await seed();
    renderRoute(`/sets/${set.id}`);
    const section = await screen.findByRole('region', { name: 'Progression' });
    const hardest = await within(section).findByRole('heading', {
      name: 'Cartes les plus difficiles',
    });
    const [first] = within(hardest.parentElement!).getAllByRole('listitem');
    expect(first).toHaveTextContent('dog→chien2 échecs sur 3 réponses');
    expect(within(section).getByText('Réponses (30 jours)').parentElement).toHaveTextContent('5');
  });

  it('règle l’objectif quotidien en minutes', async () => {
    const { user } = renderRoute('/settings');
    await user.selectOptions(await screen.findByLabelText('Mesurer en'), 'minutes');
    const target = screen.getByLabelText('Objectif');
    await user.clear(target);
    await user.type(target, '15');
    await waitFor(async () => {
      expect((await db.settings.get('goal.daily'))?.value).toEqual({ kind: 'minutes', target: 15 });
    });
  });
});
