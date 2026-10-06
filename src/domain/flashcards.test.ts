import { aStoredCard } from '@/test/factories';
import { seeded } from '@/test/random';
import {
  buildDeck,
  cardFaces,
  flashcardReducer,
  isFlashcardOptions,
  startSession,
} from './flashcards';
import type { Card } from './models';

const cards: Card[] = ['a', 'b', 'c', 'd', 'e'].map((id, order) =>
  aStoredCard(id, { order, difficult: id === 'b' || id === 'd' }),
);

describe('buildDeck', () => {
  it('garde l’ordre du set par défaut', () => {
    expect(buildDeck(cards, { shuffle: false, onlyDifficult: false })).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('ne garde que les cartes difficiles sur demande', () => {
    expect(buildDeck(cards, { shuffle: false, onlyDifficult: true })).toEqual(['b', 'd']);
  });

  it('mélange toutes les cartes sans en perdre ni en dupliquer', () => {
    const deck = buildDeck(cards, { shuffle: true, onlyDifficult: false }, seeded(42));
    expect(deck).not.toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...deck].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('cardFaces', () => {
  const langs = { sourceLang: 'es', targetLang: 'fr' };

  it('montre le terme au recto, ou la traduction en sens inverse', () => {
    const card = { term: 'el pan', translation: 'le pain' };
    expect(cardFaces(card, langs, false)).toEqual({
      front: { text: 'el pan', lang: 'es' },
      back: { text: 'le pain', lang: 'fr' },
    });
    expect(cardFaces(card, langs, true).front).toEqual({ text: 'le pain', lang: 'fr' });
  });
});

describe('flashcardReducer', () => {
  it('retourne la carte, avance en revenant au recto, puis termine', () => {
    let session = startSession(['a', 'b']);
    session = flashcardReducer(session, { type: 'flip' });
    expect(session.flipped).toBe(true);
    session = flashcardReducer(session, { type: 'next' });
    expect(session).toMatchObject({ index: 1, flipped: false, finished: false });
    session = flashcardReducer(session, { type: 'next' });
    expect(session.finished).toBe(true);
    expect(flashcardReducer(session, { type: 'next' })).toBe(session);
  });

  it('recule sans dépasser la première carte et revient depuis l’écran de fin', () => {
    let session = startSession(['a', 'b']);
    expect(flashcardReducer(session, { type: 'previous' })).toBe(session);
    session = flashcardReducer(flashcardReducer(session, { type: 'next' }), { type: 'next' });
    session = flashcardReducer(session, { type: 'previous' });
    expect(session).toMatchObject({ index: 1, finished: false });
  });

  it('considère un paquet vide comme terminé', () => {
    expect(startSession([]).finished).toBe(true);
  });
});

describe('isFlashcardOptions', () => {
  it('valide les options enregistrées', () => {
    expect(isFlashcardOptions({ reversed: true, shuffle: false, onlyDifficult: false })).toBe(true);
    expect(isFlashcardOptions({ reversed: 'oui' })).toBe(false);
    expect(isFlashcardOptions(null)).toBe(false);
  });
});
