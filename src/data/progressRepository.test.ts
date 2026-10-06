import Dexie from 'dexie';
import { aCard, aSetInput } from '@/test/factories';
import { getSetCards } from './cardsRepository';
import { createDatabase, db } from './db';
import { countIntroducedOn, loadStudyScope, recordAnswer } from './progressRepository';
import { createSet, deleteSet, touchSet } from './setsRepository';
import { saveSetting, SETTINGS } from './settingsRepository';

const MONDAY = new Date(2026, 9, 5, 9, 0);
const TUESDAY = new Date(2026, 9, 6, 9, 0);

async function seedSet(title = 'Anglais', terms = ['cat', 'dog', 'owl']) {
  const set = await createSet(
    aSetInput({ title }),
    terms.map((term) => aCard(term, term.toUpperCase())),
  );
  return { set, cards: await getSetCards(set.id) };
}

const answer = (cardId: string, grade: 'again' | 'good', updateSchedule = true) => ({
  cardId,
  grade,
  mode: 'learn' as const,
  durationMs: 1234.4,
  updateSchedule,
});

describe('enregistrement des réponses', () => {
  it('planifie la carte et ajoute la réponse à l’historique', async () => {
    const { set, cards } = await seedSet();
    const cat = cards[0]!;

    expect(await recordAnswer(answer(cat.id, 'good'), MONDAY)).toBe(true);
    expect(await db.progress.get(cat.id)).toMatchObject({
      interval: 1,
      repetitions: 1,
      dueDate: '2026-10-06',
      introducedOn: '2026-10-05',
      status: 'learning',
    });
    const [log] = await db.reviewLogs.toArray();
    expect(log).toMatchObject({
      cardId: cat.id,
      setId: set.id,
      mode: 'learn',
      result: 'good',
      durationMs: 1234,
      reviewedAt: MONDAY.toISOString(),
    });
  });

  it('ne replanifie pas une carte revue en fin de session, mais garde la trace', async () => {
    const { cards } = await seedSet();
    const cat = cards[0]!;
    await recordAnswer(answer(cat.id, 'again'), MONDAY);
    const afterFailure = await db.progress.get(cat.id);

    await recordAnswer(answer(cat.id, 'good', false), MONDAY);
    expect(await db.progress.get(cat.id)).toEqual(afterFailure);
    const results = (await db.reviewLogs.toArray()).map((log) => log.result);
    expect(results.sort()).toEqual(['again', 'good']);
  });

  it('ignore une carte supprimée entre-temps', async () => {
    const { set, cards } = await seedSet();
    await deleteSet(set.id);
    expect(await recordAnswer(answer(cards[0]!.id, 'good'), MONDAY)).toBe(false);
    expect(await db.progress.count()).toBe(0);
    expect(await db.reviewLogs.count()).toBe(0);
  });

  it('compte les cartes introduites chaque jour', async () => {
    const { cards } = await seedSet();
    await recordAnswer(answer(cards[0]!.id, 'good'), MONDAY);
    await recordAnswer(answer(cards[1]!.id, 'good'), TUESDAY);
    // Une carte revue le lendemain reste comptée le jour de son introduction.
    await recordAnswer(answer(cards[0]!.id, 'good'), TUESDAY);
    expect(await countIntroducedOn('2026-10-05')).toBe(1);
    expect(await countIntroducedOn('2026-10-06')).toBe(1);
  });
});

describe('chargement d’une session', () => {
  it('charge les cartes d’un set, leur progression et la limite globale du jour', async () => {
    const english = await seedSet('Anglais');
    const spanish = await seedSet('Espagnol', ['gato', 'perro']);
    await recordAnswer(answer(english.cards[0]!.id, 'good'), TUESDAY);
    await recordAnswer(answer(spanish.cards[0]!.id, 'good'), TUESDAY);
    await saveSetting(SETTINGS.newCardsPerDay, 5);

    const scope = await loadStudyScope(english.set.id, TUESDAY);
    expect(scope.today).toBe('2026-10-06');
    expect(scope.cards.map((card) => card.term)).toEqual(['cat', 'dog', 'owl']);
    expect([...scope.progress.keys()]).toEqual([english.cards[0]!.id]);
    expect(scope.newLimit).toBe(5);
    // La limite est partagée : la carte espagnole introduite aujourd'hui compte aussi.
    expect(scope.introducedToday).toBe(2);
  });

  it('parcourt tous les sets, du plus récemment modifié au plus ancien', async () => {
    const english = await seedSet('Anglais', ['cat', 'dog']);
    await seedSet('Espagnol', ['gato']);
    await touchSet(english.set.id, '2099-01-01T00:00:00.000Z');

    const scope = await loadStudyScope(null, TUESDAY);
    expect(scope.cards.map((card) => card.term)).toEqual(['cat', 'dog', 'gato']);
    expect(scope.sets.size).toBe(2);
    expect(scope.newLimit).toBe(10);
  });

  it('renvoie une session vide pour un set inexistant', async () => {
    const scope = await loadStudyScope('missing', TUESDAY);
    expect(scope.cards).toEqual([]);
    expect(scope.sets.size).toBe(0);
  });
});

describe('migration du schéma', () => {
  it('ajoute le jour d’introduction aux progressions de la version 1', async () => {
    const name = 'lexicards-migration-test';
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      sets: 'id, userId, updatedAt, sourceLang, targetLang, *tags',
      cards: 'id, userId, setId, [setId+order]',
      progress: 'cardId, userId, dueDate, status',
      reviewLogs: 'id, userId, cardId, setId, reviewedAt',
      settings: 'key',
    });
    await legacy.table('progress').add({ cardId: 'c1', dueDate: '2026-10-06', status: 'learning' });
    legacy.close();

    const upgraded = createDatabase(name);
    expect(await upgraded.progress.get('c1')).toMatchObject({ introducedOn: null });
    expect(await upgraded.progress.where('introducedOn').equals('2026-10-06').count()).toBe(0);
    upgraded.close();
    await Dexie.delete(name);
  });
});
