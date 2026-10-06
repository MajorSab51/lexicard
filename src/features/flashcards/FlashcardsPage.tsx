import { BookOpen } from 'lucide-react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { useSet, useSetCards } from '@/data/hooks';
import { SETTINGS, useSetting } from '@/data/settingsRepository';
import { SetNotFound } from '@/features/sets/SetNotFound';
import { t } from '@/i18n';
import { FlashcardSession } from './FlashcardSession';

/** Mode Cartes mémoire d'un set (`/sets/:setId/flashcards`). */
export function FlashcardsPage() {
  const { setId } = useParams();
  const set = useSet(setId);
  const cards = useSetCards(setId);
  const options = useSetting(SETTINGS.flashcardOptions);

  if (set === undefined || cards === undefined || options === undefined) return <Loading />;
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

  return <FlashcardSession key={set.id} set={set} cards={cards} initialOptions={options} />;
}
