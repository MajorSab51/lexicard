import { screen, waitFor } from '@testing-library/react';
import { getSetCards } from '@/data/cardsRepository';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { applyReview } from '@/domain/srs';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

const WORDS = { summer: 'été', house: 'maison' };
const TRANSLATIONS = new Map<string, string>(Object.entries(WORDS));

async function seedSet(words: Record<string, string> = WORDS) {
  const set = await createSet(
    aSetInput({ title: 'Anglais' }),
    Object.entries(words).map(([term, translation]) => aCard(term, translation)),
  );
  return { set, cards: await getSetCards(set.id) };
}

/** Terme affiché en ce moment (l'ordre des cartes est aléatoire). */
async function currentTerm() {
  const prompt = await screen.findByText(
    (_, element) => element?.tagName === 'P' && TRANSLATIONS.has(element.textContent),
  );
  return prompt.textContent;
}

const translationOf = (term: string) => TRANSLATIONS.get(term) ?? '';

const input = () => screen.getByLabelText('Ta réponse en français');

describe('mode Écrire', () => {
  it('corrige la réponse, puis passe à la carte suivante au clavier', async () => {
    const { set, cards } = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/write`);

    const first = await currentTerm();
    expect(input()).toHaveFocus();
    await user.type(input(), `  ${translationOf(first).toUpperCase()} {Enter}`);
    expect(screen.getByRole('heading', { name: 'Correct !' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuer' })).toHaveFocus();

    await user.keyboard('{Enter}');
    const second = await currentTerm();
    expect(second).not.toBe(first);
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();

    const card = cards.find((item) => item.term === first);
    await waitFor(async () => {
      expect(await db.progress.get(card!.id)).toMatchObject({ interval: 1, repetitions: 1 });
    });
    const [log] = await db.reviewLogs.toArray();
    expect(log).toMatchObject({ mode: 'write', result: 'good', cardId: card!.id });
  });

  it('montre la correction d’une erreur et repropose la carte en fin de session', async () => {
    const { set } = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/write`);

    const first = await currentTerm();
    await user.type(input(), 'je ne sais plus{Enter}');
    expect(screen.getByRole('heading', { name: 'Faux' })).toBeVisible();
    expect(screen.getByText('Ta réponse : je ne sais plus')).toBeVisible();
    expect(screen.getByText('Réponse attendue :')).toHaveTextContent(translationOf(first));
    await user.keyboard('{Enter}');

    const second = await currentTerm();
    await user.click(screen.getByRole('button', { name: 'Je ne sais pas' }));
    expect(screen.getByText('Pas de réponse.')).toBeVisible();
    await user.keyboard('{Enter}');

    expect(await currentTerm()).toBe(first);
    expect(screen.getByText('Nouvel essai')).toBeVisible();
    await user.type(input(), `${translationOf(first)}{Enter}{Enter}`);
    await user.type(input(), `${translationOf(second)}{Enter}{Enter}`);

    expect(await screen.findByText('Session terminée !')).toBeVisible();
    expect(screen.getByText('Fausses').nextSibling).toHaveTextContent('2');
    expect(screen.getByRole('heading', { name: 'À revoir' })).toBeVisible();
  });

  it('accepte une faute de frappe et signale les accents quand ils comptent', async () => {
    const { set } = await seedSet({ summer: 'été' });
    const { user } = renderRoute(`/sets/${set.id}/write`);
    await currentTerm();

    await user.click(screen.getByText('Options'));
    await user.click(screen.getByLabelText('Ignorer les accents'));
    await waitFor(async () => {
      expect((await db.settings.get('answers.tolerance'))?.value).toMatchObject({
        ignoreAccents: false,
      });
    });
    await user.type(input(), 'ete{Enter}');
    expect(screen.getByRole('heading', { name: 'Presque correct' })).toBeVisible();
  });

  it('inverse le sens : la traduction est affichée, le terme est demandé', async () => {
    const { set } = await seedSet({ summer: 'été' });
    const { user } = renderRoute(`/sets/${set.id}/write`);
    await currentTerm();

    await user.click(screen.getByText('Options'));
    await user.click(screen.getByRole('radio', { name: 'Traduction → terme' }));
    expect(await screen.findByLabelText('Ta réponse en anglais')).toBeVisible();
    expect(screen.getByText('été')).toBeVisible();
  });

  it('ne repousse pas une carte révisée en avance, sauf en cas d’oubli', async () => {
    const { set, cards } = await seedSet({ summer: 'été' });
    const scheduled = applyReview(undefined, cards[0]!.id, 'good', new Date());
    await db.progress.put(scheduled);
    const { user, unmount } = renderRoute(`/sets/${set.id}/write`);

    await currentTerm();
    await user.type(input(), 'été{Enter}');
    await waitFor(async () => {
      expect(await db.reviewLogs.count()).toBe(1);
    });
    expect(await db.progress.get(cards[0]!.id)).toEqual(scheduled);
    unmount();

    const second = renderRoute(`/sets/${set.id}/write`);
    await currentTerm();
    await second.user.type(input(), 'hiver{Enter}');
    await waitFor(async () => {
      expect(await db.progress.get(cards[0]!.id)).toMatchObject({ repetitions: 0, interval: 1 });
    });
  });
});
