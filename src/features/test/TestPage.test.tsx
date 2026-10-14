import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

const WORDS: Record<string, string> = {
  cat: 'chat',
  dog: 'chien',
  owl: 'hibou',
  fox: 'renard',
  cow: 'vache',
};

async function seedSet() {
  return createSet(
    aSetInput({ title: 'Animaux' }),
    Object.entries(WORDS).map(([term, translation]) => aCard(term, translation)),
  );
}

/** Prépare un test avec un seul type de questions et un nombre de questions donné. */
async function setUp(user: ReturnType<typeof renderRoute>['user'], type: string, count: number) {
  const field = await screen.findByLabelText('Nombre de questions');
  await user.clear(field);
  await user.type(field, String(count));
  for (const name of ['Vrai ou faux', 'Choix multiples', 'Association', 'Réponse écrite']) {
    const checkbox = screen.getByRole('checkbox', { name });
    if ((name === type) !== (checkbox as HTMLInputElement).checked) await user.click(checkbox);
  }
  await user.click(screen.getByRole('button', { name: 'Commencer le test' }));
}

/** Questions affichées, avec le terme demandé. */
function questions() {
  return screen.getAllByRole('group', { name: /^Question \d+ · / }).map((group) => ({
    group,
    term: Object.keys(WORDS).find((term) => within(group).queryByText(term)) ?? '',
  }));
}

describe('mode Test', () => {
  it('corrige des réponses écrites, signale les manques et propose de refaire les erreurs', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/test`);
    await setUp(user, 'Réponse écrite', 2);

    const [first, second] = questions();
    await user.type(within(first!.group).getByRole('textbox'), WORDS[first!.term] ?? '');
    expect(screen.getByText('1 sur 2 réponses')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Terminer le test' }));
    const dialog = await screen.findByRole('dialog', { name: 'Terminer le test ?' });
    expect(dialog).toHaveTextContent('1 réponse manque');
    await user.click(within(dialog).getByRole('button', { name: 'Terminer' }));

    expect(await screen.findByText('50 %')).toBeVisible();
    expect(screen.getByText('1 sur 2')).toBeVisible();
    const errors = screen.getByRole('region', { name: 'Erreurs' });
    expect(within(errors).getByText(second!.term)).toBeVisible();
    expect(within(errors).getByText('Pas de réponse.')).toBeVisible();
    expect(within(errors).getByText('Bonne réponse :')).toHaveTextContent(
      WORDS[second!.term] ?? '',
    );

    await waitFor(async () => {
      expect((await db.reviewLogs.toArray()).map((log) => [log.mode, log.result]).sort()).toEqual([
        ['test', 'again'],
        ['test', 'good'],
      ]);
    });

    await user.click(screen.getByRole('button', { name: 'Refaire la carte ratée' }));
    const retake = questions();
    expect(retake).toHaveLength(1);
    expect(retake[0]?.term).toBe(second!.term);
  });

  it('propose des choix multiples tirés du set', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/test`);
    await setUp(user, 'Choix multiples', 3);

    for (const { group, term } of questions()) {
      expect(within(group).getAllByRole('radio')).toHaveLength(4);
      await user.click(within(group).getByRole('radio', { name: WORDS[term] }));
    }
    await user.click(screen.getByRole('button', { name: 'Terminer le test' }));
    expect(await screen.findByText('100 %')).toBeVisible();
    expect(screen.getByText('Aucune erreur, bravo !')).toBeVisible();
  });

  it('associe plusieurs cartes dans une même question', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/test`);
    await setUp(user, 'Association', 3);

    const [group] = screen.getAllByRole('group', { name: /^Question \d+ · / });
    const selects = within(group!).getAllByRole('combobox');
    expect(selects).toHaveLength(3);
    for (const select of selects) {
      const term = select.closest('li')?.querySelector('label')?.textContent ?? '';
      await user.selectOptions(select, within(select).getByRole('option', { name: WORDS[term] }));
    }
    await user.click(screen.getByRole('button', { name: 'Terminer le test' }));
    expect(await screen.findByText('100 %')).toBeVisible();
  });

  it('retient les options du test', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/test`);
    await setUp(user, 'Vrai ou faux', 4);
    await waitFor(async () => {
      expect((await db.settings.get('test.options'))?.value).toEqual({
        count: 4,
        types: ['trueFalse'],
        reversed: false,
      });
    });
    for (const { group } of questions()) {
      expect(within(group).getByRole('radio', { name: 'Vrai' })).toBeVisible();
    }
  });
});
