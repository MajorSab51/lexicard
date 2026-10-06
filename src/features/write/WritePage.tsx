import { BookOpen, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { SETTINGS, useSetting } from '@/data/settingsRepository';
import { useStudyScope } from '@/data/useStudyScope';
import { SetNotFound } from '@/features/sets/SetNotFound';
import { t } from '@/i18n';
import { WriteSession } from './WriteSession';

/** Mode Écrire d'un set (`/sets/:setId/write`). */
export function WritePage() {
  const { setId = '' } = useParams();
  // Chaque nouvelle session recharge la progression, modifiée par la précédente.
  const [round, setRound] = useState(0);
  const scope = useStudyScope(setId, round);
  const options = useSetting(SETTINGS.writeOptions);
  const tolerance = useSetting(SETTINGS.answerTolerance);

  if (scope === undefined || !options || !tolerance) return <Loading />;
  if (scope === 'error') return <EmptyState icon={TriangleAlert} title={t('learn.loadError')} />;
  const set = scope.sets.get(setId);
  if (!set) return <SetNotFound />;
  if (scope.cards.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('setDetail.noCardsTitle')}
        body={t('setDetail.noCardsBody')}
        action={<ButtonLink to={`/sets/${set.id}/edit`}>{t('setDetail.addCards')}</ButtonLink>}
      />
    );
  }

  return (
    <WriteSession
      key={round}
      scope={scope}
      set={set}
      options={options}
      tolerance={tolerance}
      onRestart={() => {
        setRound((current) => current + 1);
      }}
    />
  );
}
