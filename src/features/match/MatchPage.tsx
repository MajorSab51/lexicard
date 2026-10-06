import { BookOpen, PartyPopper, Puzzle, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { useSet, useSetCards } from '@/data/hooks';
import { logReviews } from '@/data/reviewLogsRepository';
import { SETTINGS, updateSetting, useSetting } from '@/data/settingsRepository';
import {
  finalTime,
  isBestTime,
  MATCH_PAIRS,
  MATCH_PENALTY_MS,
  pickMatchCards,
  type MatchState,
} from '@/domain/match';
import type { Card, StudySet } from '@/domain/models';
import { SetNotFound } from '@/features/sets/SetNotFound';
import { formatSeconds, t, tn } from '@/i18n';
import { toast } from '@/lib/toast';
import { MatchBoard } from './MatchBoard';

/** Mode Associer d'un set (`/sets/:setId/match`). */
export function MatchPage() {
  const { setId } = useParams();
  const set = useSet(setId);
  const cards = useSetCards(setId);
  const bestTimes = useSetting(SETTINGS.matchBestTimes);

  if (set === undefined || cards === undefined || !bestTimes) return <Loading />;
  if (set === null) return <SetNotFound />;
  if (cards.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('setDetail.noCardsTitle')}
        body={t('setDetail.noCardsBody')}
        action={<ButtonLink to={`/sets/${set.id}/edit`}>{t('setDetail.addCards')}</ButtonLink>}
      />
    );
  }
  // Il faut au moins deux paires sans ambiguïté (l'ordre de tirage n'y change rien).
  if (pickMatchCards(cards, 2, () => 0).length < 2) {
    return (
      <EmptyState
        icon={Puzzle}
        title={t('match.needCardsTitle')}
        body={t('match.needCardsBody')}
        action={<ButtonLink to={`/sets/${set.id}/edit`}>{t('setDetail.addCards')}</ButtonLink>}
      />
    );
  }

  return <MatchGame key={set.id} set={set} cards={cards} best={bestTimes[set.id]} />;
}

type Phase =
  | { name: 'ready' }
  | { name: 'playing'; game: number; cards: Card[] }
  | { name: 'done'; game: number; time: number; mistakes: number; record: boolean };

interface MatchGameProps {
  set: StudySet;
  cards: Card[];
  /** Meilleur temps enregistré pour ce set, en millisecondes. */
  best: number | undefined;
}

function MatchGame({ set, cards, best }: MatchGameProps) {
  const [phase, setPhase] = useState<Phase>({ name: 'ready' });
  const game = phase.name === 'ready' ? 0 : phase.game;

  const start = () => {
    setPhase({ name: 'playing', game: game + 1, cards: pickMatchCards(cards, MATCH_PAIRS) });
  };

  const complete = (elapsedMs: number, state: MatchState) => {
    const time = finalTime(elapsedMs, state.mistakes);
    const record = isBestTime(time, best);
    setPhase({ name: 'done', game, time, mistakes: state.mistakes, record });
    const save = async () => {
      if (record) {
        await updateSetting(SETTINGS.matchBestTimes, (times) =>
          isBestTime(time, times[set.id]) ? { ...times, [set.id]: time } : times,
        );
      }
      await logReviews(
        state.matched.map((cardId) => ({
          cardId,
          setId: set.id,
          mode: 'match' as const,
          result: 'good' as const,
          durationMs: elapsedMs / state.matched.length,
        })),
      );
    };
    save().catch(() => {
      toast(t('common.unexpectedError'), 'error');
    });
  };

  const bestLine =
    best === undefined ? t('match.noBestTime') : t('match.bestTime', { time: formatSeconds(best) });

  switch (phase.name) {
    case 'ready':
      return (
        <EmptyState
          icon={Puzzle}
          title={t('study.modes.match')}
          body={t('match.intro')}
          action={
            <Button size="lg" onClick={start}>
              {t('match.start')}
            </Button>
          }
        >
          <p className="mt-3 font-medium">{bestLine}</p>
        </EmptyState>
      );
    case 'playing':
      return <MatchBoard key={phase.game} set={set} cards={phase.cards} onComplete={complete} />;
    case 'done':
      return (
        <EmptyState
          icon={phase.record ? Trophy : PartyPopper}
          title={t('match.finishedTitle')}
          body={t('match.finalTime', { time: formatSeconds(phase.time) })}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={start}>{t('match.replay')}</Button>
              <ButtonLink variant="secondary" to={`/sets/${set.id}`}>
                {t('study.backToSet')}
              </ButtonLink>
            </div>
          }
        >
          {phase.mistakes > 0 && (
            <p className="mt-1 text-sm text-fg-muted">
              {tn('match.penalty', (phase.mistakes * MATCH_PENALTY_MS) / 1000)}
            </p>
          )}
          <p className={`mt-3 font-semibold ${phase.record ? 'text-success' : ''}`}>
            {phase.record ? t('match.newRecord') : bestLine}
          </p>
        </EmptyState>
      );
  }
}
