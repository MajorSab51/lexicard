import { aCard, aSetInput } from '@/test/factories';
import { getSetCards } from '../cardsRepository';
import { db } from '../db';
import { createSet } from '../setsRepository';
import { setSetting } from '../settingsRepository';
import { countBackup, createBackup, parseBackup, restoreBackup } from './backup';
import { ImportError } from './errors';
import { exportAllCardsCsv, exportBackup } from './exporters';

async function seed() {
  const set = await createSet(aSetInput({ title: 'Anglais' }), [
    aCard('cat', 'chat'),
    aCard('dog', 'chien'),
  ]);
  const [cat] = await getSetCards(set.id);
  await db.progress.add({
    cardId: cat!.id,
    userId: null,
    interval: 6,
    easeFactor: 2.36,
    repetitions: 2,
    dueDate: '2026-10-11',
    lastReviewedAt: '2026-10-05T08:00:00.000Z',
    lapses: 1,
    status: 'learning',
    introducedOn: null,
  });
  await db.reviewLogs.add({
    id: 'log-1',
    userId: null,
    cardId: cat!.id,
    setId: set.id,
    mode: 'learn',
    result: 'hard',
    durationMs: 4200,
    reviewedAt: '2026-10-05T08:00:00.000Z',
  });
  await setSetting('newCardsPerDay', 12);
  return set;
}

describe('sauvegarde complète', () => {
  it('fait un aller-retour exact de toutes les tables', async () => {
    await seed();
    const before = await createBackup();
    const file = await exportBackup();
    expect(file.filename).toMatch(/^lexicards-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);

    await Promise.all([db.sets.clear(), db.cards.clear(), db.progress.clear()]);
    await createSet(aSetInput({ title: 'À écraser' }));

    const { backup, skipped } = parseBackup(file.content);
    expect(skipped).toBe(0);
    expect(countBackup(backup.data)).toEqual({
      sets: 1,
      cards: 2,
      progress: 1,
      reviewLogs: 1,
      settings: 1,
    });

    await restoreBackup(backup);
    const after = await createBackup();
    expect(after.data).toEqual(before.data);
  });

  it('écarte les éléments incohérents au lieu de tout bloquer', () => {
    const text = JSON.stringify({
      format: 'lexicards.backup',
      version: 1,
      exportedAt: '2026-10-05T08:00:00.000Z',
      data: {
        sets: [{ id: 's1', title: 'Set', color: 'fuchsia' }, { title: 'sans id' }],
        cards: [
          { id: 'c1', setId: 's1', term: 'cat', translation: 'chat' },
          { id: 'c2', setId: 'inconnu', term: 'dog', translation: 'chien' },
        ],
        progress: [{ cardId: 'c2', dueDate: '2026-10-06' }],
        reviewLogs: [{ id: 'l1', cardId: 'c1', setId: 's1', mode: 'fly', result: 'good' }],
        settings: [{ key: 'theme', value: 'dark' }],
      },
    });
    const { backup, skipped } = parseBackup(text);
    expect(backup.data.sets).toHaveLength(1);
    expect(backup.data.sets[0]).toMatchObject({ color: 'teal', tags: [], userId: null });
    expect(backup.data.cards.map((c) => c.id)).toEqual(['c1']);
    expect(backup.data.cards[0]).toMatchObject({ example: '', favorite: false, order: 0 });
    expect(backup.data.progress).toHaveLength(0);
    expect(backup.data.reviewLogs).toHaveLength(0);
    expect(skipped).toBe(4);
  });

  it('valide la progression : date due obligatoire, niveau déduit de l’intervalle', () => {
    const text = JSON.stringify({
      format: 'lexicards.backup',
      version: 1,
      data: {
        sets: [{ id: 's1', title: 'Set' }],
        cards: ['c1', 'c2', 'c3'].map((id) => ({ id, setId: 's1', term: id, translation: id })),
        progress: [
          { cardId: 'c1', dueDate: '2026-11-30', interval: 30, status: 'new', easeFactor: 0.5 },
          { cardId: 'c2', dueDate: '2026-10-08', interval: 2, introducedOn: '2026-10-06' },
          { cardId: 'c3', dueDate: 'demain' },
        ],
      },
    });
    const { backup, skipped } = parseBackup(text);
    expect(backup.data.progress).toEqual([
      expect.objectContaining({ cardId: 'c1', status: 'mastered', easeFactor: 1.3 }),
      expect.objectContaining({ cardId: 'c2', status: 'learning', introducedOn: '2026-10-06' }),
    ]);
    expect(backup.data.progress[0]?.introducedOn).toBeNull();
    expect(skipped).toBe(1);
  });

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup('[]')).toThrow(expect.objectContaining({ code: 'notBackup' }));
    expect(() => parseBackup('oups')).toThrow(ImportError);
    expect(() => parseBackup('{"format":"lexicards.backup","version":2,"data":{}}')).toThrow(
      expect.objectContaining({ code: 'unsupportedVersion' }),
    );
  });
});

describe('export CSV global', () => {
  it('exporte toutes les cartes avec le nom de leur set', async () => {
    await seed();
    const file = await exportAllCardsCsv();
    expect(file.content.startsWith('\uFEFF')).toBe(true);
    expect(file.content.split('\r\n')).toEqual([
      '\uFEFFset,terme,traduction,exemple,note,image,categorie,genre',
      'Anglais,cat,chat,,,,,',
      'Anglais,dog,chien,,,,,',
    ]);
  });
});
