import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Card, StudySet } from '@/domain/models';
import {
  buildTiles,
  finalTime,
  isMatchComplete,
  matchReducer,
  startMatch,
  type MatchState,
  type MatchTile,
} from '@/domain/match';
import { formatSeconds, t, tn } from '@/i18n';

interface MatchBoardProps {
  set: StudySet;
  cards: Card[];
  onComplete: (elapsedMs: number, state: MatchState) => void;
}

/** Temps écoulé depuis un instant donné (hors rendu : appelé seulement par les gestionnaires). */
function elapsedSince(start: number): number {
  return Date.now() - start;
}

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
];

/** Secoue une tuile après une mauvaise association, sauf si l'appareil limite les animations. */
function shake(element: HTMLElement | undefined) {
  if (!element || typeof element.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.animate(SHAKE, { duration: 400, easing: 'ease-in-out' });
}

function tileClasses(tile: MatchTile, state: MatchState): string {
  if (state.matched.includes(tile.cardId)) {
    return 'pointer-events-none border-success bg-surface text-success animate-match-out';
  }
  if (state.selected === tile.id) {
    return 'border-primary bg-primary-soft text-on-primary-soft ring-2 ring-primary';
  }
  if (state.last && !state.last.correct && state.last.tileIds.includes(tile.id)) {
    return 'border-danger bg-surface text-danger';
  }
  return 'border-border bg-surface hover:bg-surface-muted';
}

/** Grille de jeu, chronomètre et compteur d'erreurs. */
export function MatchBoard({ set, cards, onComplete }: MatchBoardProps) {
  const [state, setState] = useState(() => startMatch(buildTiles(cards, set)));
  const [elapsed, setElapsed] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const startedAt = useRef(0);
  const tileElements = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
    }, 100);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const select = (tileId: string) => {
    const next = matchReducer(state, { type: 'select', tileId });
    if (next === state) return;
    flushSync(() => {
      setState(next);
    });

    const { last } = next;
    if (last && last !== state.last) {
      const [first, second] = last.tileIds.map(
        (id) => next.tiles.find((tile) => tile.id === id)?.text ?? '',
      );
      setAnnouncement(
        t(last.correct ? 'match.correctPair' : 'match.wrongPair', {
          first: first ?? '',
          second: second ?? '',
        }),
      );
      if (last.correct) {
        // Les tuiles trouvées disparaissent : le focus passe à la première tuile restante.
        const remaining = next.tiles.find((tile) => !next.matched.includes(tile.cardId));
        if (remaining) tileElements.current.get(remaining.id)?.focus();
      } else {
        for (const id of last.tileIds) shake(tileElements.current.get(id));
      }
    }
    if (isMatchComplete(next)) onComplete(elapsedSince(startedAt.current), next);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm text-fg-muted">
          {t('match.time')}{' '}
          <span className="text-lg font-semibold text-fg tabular-nums">
            {formatSeconds(finalTime(elapsed, state.mistakes))}
          </span>
        </p>
        <p
          className={`text-sm font-medium ${state.mistakes > 0 ? 'text-danger' : 'text-fg-muted'}`}
        >
          {tn('match.mistakes', state.mistakes)}
        </p>
      </div>

      <div
        role="group"
        aria-label={t('match.grid')}
        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
      >
        {state.tiles.map((tile) => {
          const matched = state.matched.includes(tile.cardId);
          return (
            <button
              key={tile.id}
              ref={(element) => {
                if (element) tileElements.current.set(tile.id, element);
                else tileElements.current.delete(tile.id);
              }}
              type="button"
              lang={tile.lang}
              disabled={matched}
              aria-hidden={matched || undefined}
              aria-pressed={state.selected === tile.id}
              onClick={() => {
                select(tile.id);
              }}
              className={`flex min-h-24 items-center justify-center rounded-2xl border-2 p-2 text-center font-medium break-words transition-colors ${tileClasses(tile, state)}`}
            >
              {tile.text}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
