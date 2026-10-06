import { BookOpen, TriangleAlert } from 'lucide-react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { SetNotFound } from '@/features/sets/SetNotFound';
import { t } from '@/i18n';
import { LearnSession } from './LearnSession';
import { useStudyScope } from './useStudyScope';

/** Mode Apprendre : un set (`/sets/:setId/learn`), ou tous les sets (`/learn`, « Tout réviser »). */
export function LearnPage() {
  const { setId = null } = useParams();
  const scope = useStudyScope(setId);

  if (scope === undefined) return <Loading />;
  if (scope === 'error') return <EmptyState icon={TriangleAlert} title={t('learn.loadError')} />;
  if (setId && scope.sets.size === 0) return <SetNotFound />;
  if (setId && scope.cards.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('setDetail.noCardsTitle')}
        body={t('setDetail.noCardsBody')}
        action={<ButtonLink to={`/sets/${setId}/edit`}>{t('setDetail.addCards')}</ButtonLink>}
      />
    );
  }

  return <LearnSession key={setId ?? 'all'} scope={scope} setId={setId} />;
}
