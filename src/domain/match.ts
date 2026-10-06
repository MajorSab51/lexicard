import { normalizeAnswer } from './answers';
import type { Card, Id } from './models';
import { shuffle } from './random';

/*
 * Jeu Associer : une grille de tuiles (termes et traductions mélangés) à relier par paires,
 * le plus vite possible. Chaque mauvaise association ajoute une seconde au temps final,
 * pour qu'essayer toutes les combinaisons au hasard ne soit pas la meilleure stratégie.
 */

export const MATCH_PAIRS = 6;
export const MATCH_PENALTY_MS = 1000;

export interface MatchTile {
  id: string;
  cardId: Id;
  side: 'term' | 'translation';
  text: string;
  lang: string;
}

/**
 * Cartes d'une partie : au hasard, sans deux termes ni deux traductions identiques,
 * pour que chaque tuile n'ait qu'une seule paire possible.
 */
export function pickMatchCards(
  cards: readonly Card[],
  count = MATCH_PAIRS,
  random: () => number = Math.random,
): Card[] {
  const terms = new Set<string>();
  const translations = new Set<string>();
  const picked: Card[] = [];
  for (const card of shuffle(cards, random)) {
    if (picked.length >= count) break;
    const term = normalizeAnswer(card.term, false);
    const translation = normalizeAnswer(card.translation, false);
    if (terms.has(term) || translations.has(translation)) continue;
    terms.add(term);
    translations.add(translation);
    picked.push(card);
  }
  return picked;
}

export function buildTiles(
  cards: readonly Card[],
  langs: { sourceLang: string; targetLang: string },
  random: () => number = Math.random,
): MatchTile[] {
  const tiles = cards.flatMap((card): MatchTile[] => [
    {
      id: `${card.id}:term`,
      cardId: card.id,
      side: 'term',
      text: card.term,
      lang: langs.sourceLang,
    },
    {
      id: `${card.id}:translation`,
      cardId: card.id,
      side: 'translation',
      text: card.translation,
      lang: langs.targetLang,
    },
  ]);
  return shuffle(tiles, random);
}

export interface MatchState {
  tiles: readonly MatchTile[];
  /** Tuile sélectionnée, en attente de sa paire. */
  selected: string | null;
  /** Cartes dont la paire a été trouvée, dans l'ordre. */
  matched: readonly Id[];
  mistakes: number;
  /** Dernière tentative, pour l'animation et l'annonce aux lecteurs d'écran. */
  last: { tileIds: [string, string]; correct: boolean } | null;
}

export type MatchAction = { type: 'select'; tileId: string };

export function startMatch(tiles: readonly MatchTile[]): MatchState {
  return { tiles, selected: null, matched: [], mistakes: 0, last: null };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  const tile = state.tiles.find((item) => item.id === action.tileId);
  if (!tile || state.matched.includes(tile.cardId)) return state;

  const selected = state.tiles.find((item) => item.id === state.selected);
  if (!selected) return { ...state, selected: tile.id, last: null };
  if (selected.id === tile.id) return { ...state, selected: null };
  // Deux tuiles du même côté : la sélection change simplement de tuile.
  if (selected.side === tile.side) return { ...state, selected: tile.id, last: null };

  const correct = selected.cardId === tile.cardId;
  return {
    ...state,
    selected: null,
    matched: correct ? [...state.matched, tile.cardId] : state.matched,
    mistakes: state.mistakes + (correct ? 0 : 1),
    last: { tileIds: [selected.id, tile.id], correct },
  };
}

export function isMatchComplete(state: MatchState): boolean {
  return state.tiles.length > 0 && state.matched.length * 2 === state.tiles.length;
}

/** Temps final : temps écoulé plus une seconde par erreur. */
export function finalTime(elapsedMs: number, mistakes: number): number {
  return Math.max(0, Math.round(elapsedMs)) + mistakes * MATCH_PENALTY_MS;
}

export function isBestTime(timeMs: number, bestMs: number | undefined): boolean {
  return bestMs === undefined || timeMs < bestMs;
}

export function isBestTimes(value: unknown): value is Record<Id, number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((time) => typeof time === 'number' && time >= 0)
  );
}
