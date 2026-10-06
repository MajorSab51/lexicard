import { ArrowLeft, ArrowRight, Flag, PartyPopper, SlidersHorizontal, Star } from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { CardDetails } from '@/components/CardDetails';
import { EmptyState } from '@/components/EmptyState';
import { setCardFlags } from '@/data/cardsRepository';
import { logReview } from '@/data/reviewLogsRepository';
import { saveSetting, SETTINGS } from '@/data/settingsRepository';
import {
  buildDeck,
  cardFaces,
  flashcardReducer,
  startSession,
  type FlashcardOptions,
} from '@/domain/flashcards';
import type { Card, Id, StudySet } from '@/domain/models';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSwipe } from '@/hooks/useSwipe';
import { t, tn } from '@/i18n';
import { FlashcardFace } from './FlashcardFace';

interface FlashcardSessionProps {
  set: StudySet;
  /** Cartes du set, tenues à jour en direct (marquages, modifications). */
  cards: Card[];
  initialOptions: FlashcardOptions;
}

/** Temps écoulé depuis un instant donné (hors rendu : appelé seulement par les gestionnaires). */
function elapsedSince(start: number): number {
  return Date.now() - start;
}

const flagButton =
  'flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors';

export function FlashcardSession({ set, cards, initialOptions }: FlashcardSessionProps) {
  const [options, setOptions] = useState(initialOptions);
  const [session, dispatch] = useReducer(flashcardReducer, undefined, () =>
    startSession(buildDeck(cards, initialOptions)),
  );
  const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const difficultCount = cards.filter((card) => card.difficult).length;

  // Historique : chaque carte compte une fois par tour, au premier retournement.
  const seen = useRef(new Set<Id>());
  const shownAt = useRef(0);
  const currentId = session.deck[session.index];
  const current = currentId ? cardsById.get(currentId) : undefined;
  useEffect(() => {
    shownAt.current = Date.now();
  }, [currentId]);

  const restart = (next: FlashcardOptions) => {
    seen.current = new Set();
    dispatch({ type: 'start', deck: buildDeck(cards, next) });
  };

  const changeOptions = (patch: Partial<FlashcardOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    void saveSetting(SETTINGS.flashcardOptions, next);
    // Le sens peut changer en cours de route ; le mélange et le filtre recomposent le paquet.
    if ('shuffle' in patch || 'onlyDifficult' in patch) restart(next);
  };

  const flip = () => {
    if (session.finished) return;
    if (!session.flipped && current && !seen.current.has(current.id)) {
      seen.current.add(current.id);
      void logReview({
        cardId: current.id,
        setId: set.id,
        mode: 'flashcards',
        result: 'seen',
        durationMs: elapsedSince(shownAt.current),
      });
    }
    dispatch({ type: 'flip' });
  };
  const next = () => {
    dispatch({ type: 'next' });
  };
  const previous = () => {
    dispatch({ type: 'previous' });
  };

  useKeyboardShortcuts({ ' ': flip, ArrowLeft: previous, ArrowRight: next });
  const swipe = useSwipe({ onTap: flip, onSwipeLeft: next, onSwipeRight: previous });

  const optionsPanel = (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium select-none">
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        {t('flashcards.options')}
      </summary>
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('flashcards.direction')}</legend>
          {[false, true].map((reversed) => (
            <label key={String(reversed)} className="flex items-center gap-2 py-1">
              <input
                type="radio"
                name="flashcard-direction"
                checked={options.reversed === reversed}
                onChange={() => {
                  changeOptions({ reversed });
                }}
                className="size-4 accent-(--primary)"
              />
              {reversed ? t('flashcards.translationFirst') : t('flashcards.termFirst')}
            </label>
          ))}
        </fieldset>
        <div className="grid content-start gap-1">
          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={options.shuffle}
              onChange={(event) => {
                changeOptions({ shuffle: event.target.checked });
              }}
              className="size-4 accent-(--primary)"
            />
            {t('flashcards.shuffle')}
          </label>
          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={options.onlyDifficult}
              onChange={(event) => {
                changeOptions({ onlyDifficult: event.target.checked });
              }}
              className="size-4 accent-(--primary)"
            />
            {t('flashcards.onlyDifficult', { count: difficultCount })}
          </label>
        </div>
      </div>
    </details>
  );

  if (session.deck.length === 0) {
    return (
      <div className="grid gap-4">
        {optionsPanel}
        <EmptyState
          icon={Flag}
          title={t('flashcards.noDifficultTitle')}
          body={t('flashcards.noDifficultBody')}
          action={
            <Button
              onClick={() => {
                changeOptions({ onlyDifficult: false });
              }}
            >
              {t('flashcards.showAll')}
            </Button>
          }
        />
      </div>
    );
  }

  if (session.finished) {
    return (
      <EmptyState
        icon={PartyPopper}
        title={t('flashcards.finishedTitle')}
        body={tn('flashcards.finishedBody', session.deck.length)}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                restart(options);
              }}
            >
              {t('flashcards.restart')}
            </Button>
            {difficultCount > 0 && !options.onlyDifficult && (
              <Button
                variant="secondary"
                onClick={() => {
                  changeOptions({ onlyDifficult: true });
                }}
              >
                {tn('flashcards.reviewDifficult', difficultCount)}
              </Button>
            )}
            <ButtonLink variant="ghost" to={`/sets/${set.id}`}>
              {t('flashcards.backToSet')}
            </ButtonLink>
          </div>
        }
      />
    );
  }

  const total = session.deck.length;
  const position = session.index + 1;
  const faces = current ? cardFaces(current, set, options.reversed) : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="mb-1.5 text-sm font-medium text-fg-muted">
            {t('flashcards.progress', { current: position, total })}
          </p>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={position}
            aria-label={t('flashcards.progress', { current: position, total })}
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(position / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {optionsPanel}

      {current && faces ? (
        <>
          <div
            className="relative max-h-[32rem] min-h-80 flex-1 perspective-distant md:min-h-96"
            style={
              swipe.offsetX
                ? { transform: `translateX(${swipe.offsetX}px) rotate(${swipe.offsetX / 30}deg)` }
                : undefined
            }
          >
            {/* Bouton de retournement sous les faces : clic, appui, Entrée ou Espace. */}
            <button
              type="button"
              aria-label={t('flashcards.flip')}
              className="absolute inset-0 cursor-pointer touch-pan-y rounded-3xl outline-offset-4"
              {...swipe.handlers}
            />
            <div
              className={`pointer-events-none absolute inset-0 transition-transform duration-500 transform-3d ${
                session.flipped ? 'rotate-y-180' : ''
              }`}
            >
              <FlashcardFace
                face={faces.front}
                label={t('flashcards.front')}
                hidden={session.flipped}
              />
              <FlashcardFace
                face={faces.back}
                label={t('flashcards.back')}
                hidden={!session.flipped}
                back
              >
                <CardDetails card={current} termLang={set.sourceLang} />
              </FlashcardFace>
            </div>
          </div>
          <p aria-live="polite" className="sr-only">
            {session.flipped
              ? t('flashcards.announceBack', { text: faces.back.text })
              : t('flashcards.announceFront', { text: faces.front.text })}
          </p>
        </>
      ) : (
        <p className="flex min-h-80 flex-1 items-center justify-center text-fg-muted">
          {t('flashcards.missingCard')}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          onClick={previous}
          disabled={session.index === 0}
          aria-label={t('flashcards.previous')}
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">{t('flashcards.previous')}</span>
        </Button>
        {current && (
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={current.favorite}
              onClick={() => void setCardFlags(current.id, { favorite: !current.favorite })}
              className={`${flagButton} ${
                current.favorite
                  ? 'border-warning text-warning'
                  : 'border-border text-fg-muted hover:text-fg'
              }`}
            >
              <Star
                aria-hidden="true"
                className={`size-5 ${current.favorite ? 'fill-current' : ''}`}
              />
              <span className="sr-only sm:not-sr-only">{t('flashcards.markFavorite')}</span>
            </button>
            <button
              type="button"
              aria-pressed={current.difficult}
              onClick={() => void setCardFlags(current.id, { difficult: !current.difficult })}
              className={`${flagButton} ${
                current.difficult
                  ? 'border-danger text-danger'
                  : 'border-border text-fg-muted hover:text-fg'
              }`}
            >
              <Flag
                aria-hidden="true"
                className={`size-5 ${current.difficult ? 'fill-current' : ''}`}
              />
              <span className="sr-only sm:not-sr-only">{t('flashcards.markDifficult')}</span>
            </button>
          </div>
        )}
        <Button onClick={next} aria-label={t('flashcards.next')}>
          <span className="hidden sm:inline">{t('flashcards.next')}</span>
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </div>

      <p className="text-center text-sm text-fg-muted">
        <span className="pointer-coarse:hidden">{t('flashcards.keyboardHint')}</span>
        <span className="hidden pointer-coarse:inline">{t('flashcards.touchHint')}</span>
      </p>
    </div>
  );
}
