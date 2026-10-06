import { aCard, aSetInput } from '@/test/factories';
import { addCards, deleteCards, getSetCards, moveCards, setCardFlags } from './cardsRepository';
import { db } from './db';
import { createSet, deleteSet, duplicateSet, saveSetWithCards, updateSet } from './setsRepository';
import { getSetting, setSetting } from './settingsRepository';

async function addProgress(cardId: string) {
  await db.progress.add({
    cardId,
    userId: null,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    dueDate: '2026-10-06',
    lastReviewedAt: null,
    lapses: 0,
    status: 'learning',
    introducedOn: null,
  });
}

describe('sets', () => {
  it('crée un set avec ses cartes, en ignorant les lignes vides', async () => {
    const set = await createSet(
      aSetInput({ title: '  Mon   set ', tags: ['B1', 'b1', 'voyage'] }),
      [aCard('cat', 'chat'), aCard('', ''), aCard(' dog ', 'chien')],
    );

    expect(set.title).toBe('Mon set');
    expect(set.tags).toEqual(['B1', 'voyage']);
    expect(set.userId).toBeNull();
    const cards = await getSetCards(set.id);
    expect(cards.map((card) => [card.term, card.order])).toEqual([
      ['cat', 0],
      ['dog', 1],
    ]);
  });

  it('met à jour les métadonnées', async () => {
    const set = await createSet(aSetInput());
    await updateSet(set.id, aSetInput({ title: 'Espagnol', sourceLang: 'es' }));
    const updated = await db.sets.get(set.id);
    expect(updated?.title).toBe('Espagnol');
    expect(updated?.sourceLang).toBe('es');
    expect(updated && updated.updatedAt >= set.updatedAt).toBe(true);
  });

  it('supprime un set avec ses cartes et leur progression, mais garde l’historique', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat')]);
    const [card] = await getSetCards(set.id);
    await addProgress(card!.id);
    await db.reviewLogs.add({
      id: 'log-1',
      userId: null,
      cardId: card!.id,
      setId: set.id,
      mode: 'learn',
      result: 'good',
      durationMs: 1000,
      reviewedAt: new Date().toISOString(),
    });

    await deleteSet(set.id);

    expect(await db.sets.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
    expect(await db.progress.count()).toBe(0);
    expect(await db.reviewLogs.count()).toBe(1);
  });

  it('duplique un set sans copier la progression', async () => {
    const set = await createSet(aSetInput({ tags: ['B1'] }), [
      aCard('cat', 'chat'),
      aCard('dog', 'chien'),
    ]);
    const [card] = await getSetCards(set.id);
    await addProgress(card!.id);

    const copy = await duplicateSet(set.id, 'Copie');

    expect(copy.id).not.toBe(set.id);
    expect(copy.title).toBe('Copie');
    expect(copy.tags).toEqual(['B1']);
    const copiedCards = await getSetCards(copy.id);
    expect(copiedCards.map((c) => c.term)).toEqual(['cat', 'dog']);
    expect(copiedCards.every((c) => c.setId === copy.id)).toBe(true);
    expect(await db.progress.count()).toBe(1);
  });
});

describe('saveSetWithCards', () => {
  it('crée un nouveau set quand aucun identifiant n’est fourni', async () => {
    const id = await saveSetWithCards(null, aSetInput(), [{ content: aCard('cat', 'chat') }]);
    expect((await getSetCards(id)).map((c) => c.term)).toEqual(['cat']);
  });

  it('met à jour, ajoute, réordonne et supprime en une fois', async () => {
    const set = await createSet(aSetInput(), [
      aCard('cat', 'chat'),
      aCard('dog', 'chien'),
      aCard('bird', 'oiseau'),
    ]);
    const [cat, dog, bird] = await getSetCards(set.id);
    await addProgress(dog!.id);
    await setCardFlags(bird!.id, { favorite: true });

    await saveSetWithCards(set.id, aSetInput({ title: 'Renommé' }), [
      { id: bird!.id, content: aCard('bird', 'oiseau') },
      { content: aCard('fish', 'poisson') },
      { id: cat!.id, content: aCard('cat', 'chat (animal)') },
      { content: aCard('', '') },
    ]);

    const cards = await getSetCards(set.id);
    expect(cards.map((c) => [c.term, c.translation, c.order])).toEqual([
      ['bird', 'oiseau', 0],
      ['fish', 'poisson', 1],
      ['cat', 'chat (animal)', 2],
    ]);
    expect(cards[0]?.favorite).toBe(true);
    expect(cards[0]?.id).toBe(bird!.id);
    expect(await db.progress.get(dog!.id)).toBeUndefined();
    expect((await db.sets.get(set.id))?.title).toBe('Renommé');
  });
});

describe('cartes', () => {
  it('ajoute des cartes à la fin du set', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat')]);
    const added = await addCards(set.id, [
      aCard('dog', 'chien'),
      aCard('', ''),
      aCard('owl', 'hibou'),
    ]);
    expect(added).toBe(2);
    expect((await getSetCards(set.id)).map((c) => [c.term, c.order])).toEqual([
      ['cat', 0],
      ['dog', 1],
      ['owl', 2],
    ]);
  });

  it('marque une carte favorite ou difficile', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat')]);
    const [card] = await getSetCards(set.id);
    await setCardFlags(card!.id, { difficult: true });
    const updated = await db.cards.get(card!.id);
    expect(updated?.difficult).toBe(true);
    expect(updated?.favorite).toBe(false);
  });

  it('supprime des cartes et leur progression', async () => {
    const set = await createSet(aSetInput(), [aCard('cat', 'chat'), aCard('dog', 'chien')]);
    const [cat] = await getSetCards(set.id);
    await addProgress(cat!.id);
    await deleteCards([cat!.id]);
    expect((await getSetCards(set.id)).map((c) => c.term)).toEqual(['dog']);
    expect(await db.progress.count()).toBe(0);
  });

  it('déplace des cartes vers un autre set en conservant leur progression', async () => {
    const source = await createSet(aSetInput(), [
      aCard('cat', 'chat'),
      aCard('dog', 'chien'),
      aCard('owl', 'hibou'),
    ]);
    const target = await createSet(aSetInput({ title: 'Cible' }), [aCard('fish', 'poisson')]);
    const [cat, , owl] = await getSetCards(source.id);
    await addProgress(owl!.id);

    await moveCards([owl!.id, cat!.id], target.id);

    expect((await getSetCards(source.id)).map((c) => c.term)).toEqual(['dog']);
    expect((await getSetCards(target.id)).map((c) => [c.term, c.order])).toEqual([
      ['fish', 0],
      ['cat', 1],
      ['owl', 2],
    ]);
    expect(await db.progress.get(owl!.id)).toBeDefined();
  });

  it('refuse un déplacement vers un set inexistant', async () => {
    const source = await createSet(aSetInput(), [aCard('cat', 'chat')]);
    const [cat] = await getSetCards(source.id);
    await expect(moveCards([cat!.id], 'inconnu')).rejects.toThrow();
    expect((await getSetCards(source.id)).length).toBe(1);
  });
});

describe('paramètres', () => {
  it('lit la valeur par défaut puis la valeur enregistrée', async () => {
    expect(await getSetting('newCardsPerDay', 10)).toBe(10);
    await setSetting('newCardsPerDay', 15);
    expect(await getSetting('newCardsPerDay', 10)).toBe(15);
  });

  it('ignore une valeur d’un type inattendu', async () => {
    await setSetting('newCardsPerDay', 'beaucoup');
    expect(await getSetting('newCardsPerDay', 10)).toBe(10);
  });
});
