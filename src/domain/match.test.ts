import { aStoredCard } from '@/test/factories';
import { seeded } from '@/test/random';
import {
  buildTiles,
  finalTime,
  isBestTime,
  isBestTimes,
  isMatchComplete,
  matchReducer,
  pickMatchCards,
  startMatch,
  type MatchState,
} from './match';

const langs = { sourceLang: 'es', targetLang: 'fr' };
const cards = [
  aStoredCard('gato', { term: 'gato', translation: 'chat' }),
  aStoredCard('perro', { term: 'perro', translation: 'chien' }),
  aStoredCard('pan', { term: 'pan', translation: 'pain' }),
];

const select = (state: MatchState, ...tileIds: string[]) =>
  tileIds.reduce((current, tileId) => matchReducer(current, { type: 'select', tileId }), state);

describe('préparation d’une partie', () => {
  it('prend jusqu’à six cartes sans termes ni traductions en double', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      aStoredCard(`c${String(i)}`, { term: `t${String(i)}`, translation: `tr${String(i)}` }),
    );
    expect(pickMatchCards(many, 6, seeded(2))).toHaveLength(6);

    const duplicates = [
      aStoredCard('a', { term: 'banco', translation: 'banc' }),
      aStoredCard('b', { term: 'Banco', translation: 'banque' }),
      aStoredCard('c', { term: 'silla', translation: 'chaise' }),
    ];
    const picked = pickMatchCards(duplicates, 6, seeded(1));
    expect(picked).toHaveLength(2);
    expect(picked.filter((card) => card.term.toLowerCase() === 'banco')).toHaveLength(1);
  });

  it('crée deux tuiles par carte, mélangées, avec leur langue', () => {
    const tiles = buildTiles(cards, langs, seeded(5));
    expect(tiles).toHaveLength(6);
    expect(tiles.find((tile) => tile.id === 'gato:term')).toMatchObject({
      text: 'gato',
      lang: 'es',
    });
    expect(tiles.find((tile) => tile.id === 'gato:translation')).toMatchObject({
      text: 'chat',
      lang: 'fr',
    });
    expect(tiles.map((tile) => tile.id)).not.toEqual(
      buildTiles(cards, langs, () => 0.999).map((t) => t.id),
    );
  });
});

describe('déroulement', () => {
  const start = () => startMatch(buildTiles(cards, langs, seeded(5)));

  it('valide une bonne paire', () => {
    const state = select(start(), 'gato:term', 'gato:translation');
    expect(state.matched).toEqual(['gato']);
    expect(state.last).toEqual({ tileIds: ['gato:term', 'gato:translation'], correct: true });
    expect(state.selected).toBeNull();
  });

  it('compte une erreur pour une mauvaise paire', () => {
    const state = select(start(), 'gato:term', 'perro:translation');
    expect(state.matched).toEqual([]);
    expect(state.mistakes).toBe(1);
    expect(state.last?.correct).toBe(false);
  });

  it('change de sélection entre deux tuiles du même côté, sans pénalité', () => {
    const state = select(start(), 'gato:term', 'perro:term');
    expect(state.selected).toBe('perro:term');
    expect(state.mistakes).toBe(0);
    expect(select(state, 'perro:term').selected).toBeNull();
  });

  it('ignore les tuiles déjà associées et détecte la fin de partie', () => {
    let state = select(start(), 'gato:term', 'gato:translation');
    expect(select(state, 'gato:term')).toBe(state);
    state = select(state, 'perro:translation', 'perro:term', 'pan:term', 'pan:translation');
    expect(isMatchComplete(state)).toBe(true);
  });
});

describe('temps', () => {
  it('ajoute une seconde par erreur', () => {
    expect(finalTime(12_345.6, 0)).toBe(12_346);
    expect(finalTime(12_000, 3)).toBe(15_000);
  });

  it('détecte un nouveau record', () => {
    expect(isBestTime(10_000, undefined)).toBe(true);
    expect(isBestTime(9_000, 10_000)).toBe(true);
    expect(isBestTime(10_000, 10_000)).toBe(false);
  });

  it('valide les meilleurs temps enregistrés', () => {
    expect(isBestTimes({ set1: 12_000 })).toBe(true);
    expect(isBestTimes({ set1: 'vite' })).toBe(false);
    expect(isBestTimes([])).toBe(false);
  });
});
