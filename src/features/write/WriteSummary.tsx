import { PartyPopper } from 'lucide-react';
import { Button, ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { StatTiles } from '@/components/StatTiles';
import { cardFaces } from '@/domain/flashcards';
import type { Card, Id, StudySet } from '@/domain/models';
import { countVerdicts, type WriteOptions, type WriteSession } from '@/domain/writeSession';
import { t, tn } from '@/i18n';

interface WriteSummaryProps {
  session: WriteSession;
  cards: ReadonlyMap<Id, Card>;
  set: StudySet;
  options: WriteOptions;
  onRestart: () => void;
}

/** Bilan du mode Écrire : score du premier essai et cartes à revoir. */
export function WriteSummary({ session, cards, set, options, onRestart }: WriteSummaryProps) {
  const counts = countVerdicts(session.results);
  const missed = session.results.flatMap((result) => {
    const card = result.verdict === 'wrong' ? cards.get(result.cardId) : undefined;
    return card ? [cardFaces(card, set, options.reversed)] : [];
  });

  return (
    <EmptyState
      icon={PartyPopper}
      title={t('write.finishedTitle')}
      body={tn('write.finishedBody', session.results.length)}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart}>{t('write.restart')}</Button>
          <ButtonLink variant="secondary" to={`/sets/${set.id}`}>
            {t('study.backToSet')}
          </ButtonLink>
        </div>
      }
    >
      <StatTiles
        className="mt-5 w-full max-w-md text-left"
        items={[
          { label: t('write.tally.correct'), value: counts.correct, tone: 'success' },
          { label: t('write.tally.almost'), value: counts.almost },
          { label: t('write.tally.wrong'), value: counts.wrong },
        ]}
      />
      {missed.length > 0 && (
        <section aria-labelledby="write-missed" className="mt-6 w-full max-w-md text-left">
          <h3 id="write-missed" className="mb-2 font-semibold">
            {t('write.toReview')}
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {missed.map(({ front, back }) => (
              <li key={`${front.text}-${back.text}`} className="flex flex-wrap gap-x-2 px-3 py-2">
                <span lang={front.lang} className="font-medium">
                  {front.text}
                </span>
                <span aria-hidden="true">→</span>
                <span lang={back.lang}>{back.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </EmptyState>
  );
}
