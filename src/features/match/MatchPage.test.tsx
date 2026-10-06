import { screen, waitFor, within } from '@testing-library/react';
import { db } from '@/data/db';
import { createSet } from '@/data/setsRepository';
import { aCard, aSetInput } from '@/test/factories';
import { renderRoute } from '@/test/renderRoute';

const PAIRS: Record<string, string> = { gato: 'chat', perro: 'chien' };

async function seedSet(pairs = PAIRS) {
  return createSet(
    aSetInput({ title: 'Espagnol', sourceLang: 'es' }),
    Object.entries(pairs).map(([term, translation]) => aCard(term, translation)),
  );
}

const tile = (text: string) =>
  within(screen.getByRole('group', { name: 'Tuiles à associer' })).getByRole('button', {
    name: text,
  });

describe('mode Associer', () => {
  it('compte les erreurs, termine la partie et enregistre le meilleur temps', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/match`);

    expect(await screen.findByText('Pas encore de meilleur temps pour ce set.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Commencer' }));

    await user.click(tile('gato'));
    expect(tile('gato')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tile('chien'));
    expect(screen.getByText('1 erreur')).toBeVisible();
    expect(screen.getByText('Mauvaise association : gato et chien.')).toBeInTheDocument();

    await user.click(tile('gato'));
    await user.click(tile('chat'));
    expect(screen.getByText('Bonne association : gato et chat.')).toBeInTheDocument();
    await user.click(tile('chien'));
    await user.click(tile('perro'));

    expect(await screen.findByText('Terminé !')).toBeVisible();
    expect(screen.getByText('Nouveau record !')).toBeVisible();
    expect(screen.getByText('dont 1 seconde de pénalité')).toBeVisible();

    await waitFor(async () => {
      const best = (await db.settings.get('match.bestTimes'))?.value as Record<string, number>;
      expect(best[set.id]).toBeGreaterThanOrEqual(1000);
    });
    await waitFor(async () => {
      expect((await db.reviewLogs.toArray()).every((log) => log.mode === 'match')).toBe(true);
      expect(await db.reviewLogs.count()).toBe(2);
    });

    await user.click(screen.getByRole('button', { name: 'Rejouer' }));
    expect(tile('gato')).toBeVisible();
  });

  it('change simplement de sélection entre deux tuiles du même côté', async () => {
    const set = await seedSet();
    const { user } = renderRoute(`/sets/${set.id}/match`);
    await user.click(await screen.findByRole('button', { name: 'Commencer' }));

    await user.click(tile('gato'));
    await user.click(tile('perro'));
    expect(tile('perro')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('0 erreur')).toBeVisible();
  });

  it('demande au moins deux paires sans ambiguïté', async () => {
    const set = await seedSet({ banco: 'banc' });
    renderRoute(`/sets/${set.id}/match`);
    expect(await screen.findByText('Pas assez de cartes')).toBeVisible();
  });
});
