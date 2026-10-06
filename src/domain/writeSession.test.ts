import type { CardProgress } from './models';
import { applyReview } from './srs';
import {
  countVerdicts,
  isWriteOptions,
  startWriteSession,
  VERDICT_GRADE,
  writeReducer,
  writeUpdatesSchedule,
  type WriteAction,
  type WriteSession,
} from './writeSession';

const run = (session: WriteSession, actions: WriteAction[]) =>
  actions.reduce(writeReducer, session);
const answer = (given: string, verdict: 'correct' | 'almost' | 'wrong'): WriteAction[] => [
  { type: 'submit', given, verdict },
  { type: 'continue' },
];

describe('session Écrire', () => {
  it('affiche la correction puis passe à la carte suivante', () => {
    let session = startWriteSession(['a', 'b']);
    session = writeReducer(session, { type: 'submit', given: 'chat', verdict: 'correct' });
    expect(session.feedback).toEqual({ given: 'chat', verdict: 'correct' });
    expect(session.queue[0]?.cardId).toBe('a');
    // Une seconde validation pendant la correction est ignorée.
    expect(writeReducer(session, { type: 'submit', given: 'x', verdict: 'wrong' })).toBe(session);
    session = writeReducer(session, { type: 'continue' });
    expect(session.feedback).toBeNull();
    expect(session.queue.map((item) => item.cardId)).toEqual(['b']);
  });

  it('remet une carte ratée en fin de session sans compter le nouvel essai', () => {
    const session = run(startWriteSession(['a', 'b']), [
      ...answer('?', 'wrong'),
      ...answer('chein', 'almost'),
      ...answer('chien', 'wrong'),
      ...answer('chat', 'correct'),
    ]);
    expect(session.queue).toEqual([]);
    expect(session.results).toEqual([
      { cardId: 'a', verdict: 'wrong', given: '?' },
      { cardId: 'b', verdict: 'almost', given: 'chein' },
    ]);
    expect(countVerdicts(session.results)).toEqual({ correct: 0, almost: 1, wrong: 1 });
  });

  it('ne continue qu’après une correction', () => {
    const session = startWriteSession(['a']);
    expect(writeReducer(session, { type: 'continue' })).toBe(session);
  });

  it('valide les options', () => {
    expect(isWriteOptions({ reversed: true })).toBe(true);
    expect(isWriteOptions({ reversed: 'oui' })).toBe(false);
  });
});

describe('répétition espacée du mode Écrire', () => {
  const now = new Date(2026, 9, 6, 9, 0);
  const scheduled: CardProgress = applyReview(undefined, 'a', 'good', now); // due le 7

  it('associe chaque correction à une note', () => {
    expect(VERDICT_GRADE).toEqual({ correct: 'good', almost: 'hard', wrong: 'again' });
  });

  it('replanifie une carte nouvelle ou due, quelle que soit la réponse', () => {
    expect(writeUpdatesSchedule(undefined, '2026-10-06', 'good')).toBe(true);
    expect(writeUpdatesSchedule(scheduled, '2026-10-07', 'good')).toBe(true);
    expect(writeUpdatesSchedule(scheduled, '2026-10-09', 'hard')).toBe(true);
  });

  it('ne replanifie une carte prévue plus tard qu’en cas d’oubli', () => {
    expect(writeUpdatesSchedule(scheduled, '2026-10-06', 'good')).toBe(false);
    expect(writeUpdatesSchedule(scheduled, '2026-10-06', 'hard')).toBe(false);
    expect(writeUpdatesSchedule(scheduled, '2026-10-06', 'again')).toBe(true);
  });
});
