import {
  currentItem,
  isFinished,
  learnReducer,
  remainingByKind,
  startLearnSession,
  studiedCount,
  updatesSchedule,
  type LearnAction,
  type LearnSession,
} from './learnSession';

const run = (session: LearnSession, actions: LearnAction[]) =>
  actions.reduce(learnReducer, session);
const answer = (grade: 'again' | 'hard' | 'good' | 'easy'): LearnAction[] => [
  { type: 'reveal' },
  { type: 'answer', grade },
];

describe('session Apprendre', () => {
  const start = () => startLearnSession({ reviewIds: ['r1', 'r2'], newIds: ['n1'] });

  it('présente les révisions puis les nouvelles cartes', () => {
    const session = start();
    expect(session.queue).toEqual([
      { cardId: 'r1', kind: 'review' },
      { cardId: 'r2', kind: 'review' },
      { cardId: 'n1', kind: 'new' },
    ]);
    expect(remainingByKind(session)).toEqual({ review: 2, new: 1, relearn: 0 });
  });

  it('demande d’afficher la réponse avant de noter', () => {
    const session = learnReducer(start(), { type: 'answer', grade: 'good' });
    expect(currentItem(session)?.cardId).toBe('r1');
    const revealed = learnReducer(session, { type: 'reveal' });
    expect(revealed.revealed).toBe(true);
    expect(currentItem(learnReducer(revealed, { type: 'answer', grade: 'good' }))?.cardId).toBe(
      'r2',
    );
  });

  it('remet une carte ratée en fin de session jusqu’à ce qu’elle soit retrouvée', () => {
    let session = run(start(), answer('again'));
    expect(session.queue.at(-1)).toEqual({ cardId: 'r1', kind: 'relearn' });
    expect(remainingByKind(session)).toEqual({ review: 1, new: 1, relearn: 1 });

    session = run(session, [...answer('good'), ...answer('easy')]);
    expect(currentItem(session)).toEqual({ cardId: 'r1', kind: 'relearn' });
    session = run(session, answer('again'));
    expect(currentItem(session)).toEqual({ cardId: 'r1', kind: 'relearn' });
    session = run(session, answer('hard'));
    expect(isFinished(session)).toBe(true);
  });

  it('ne compte que la première réponse de chaque carte', () => {
    const session = run(start(), [
      ...answer('again'),
      ...answer('good'),
      ...answer('easy'),
      ...answer('again'),
      ...answer('good'),
    ]);
    expect(session.tally).toEqual({ again: 1, hard: 0, good: 1, easy: 1 });
    expect(studiedCount(session)).toBe(3);
  });

  it('ne replanifie qu’à la première réponse', () => {
    expect(updatesSchedule({ cardId: 'a', kind: 'review' })).toBe(true);
    expect(updatesSchedule({ cardId: 'a', kind: 'new' })).toBe(true);
    expect(updatesSchedule({ cardId: 'a', kind: 'relearn' })).toBe(false);
  });

  it('passe une carte supprimée entre-temps', () => {
    const session = learnReducer(start(), { type: 'skip' });
    expect(currentItem(session)?.cardId).toBe('r2');
    expect(studiedCount(session)).toBe(0);
  });

  it('est terminée d’emblée quand il n’y a rien à réviser', () => {
    const session = startLearnSession({ reviewIds: [], newIds: [] });
    expect(isFinished(session)).toBe(true);
    expect(learnReducer(session, { type: 'reveal' })).toBe(session);
  });
});
