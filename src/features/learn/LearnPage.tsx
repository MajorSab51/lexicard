import { useParams } from 'react-router';
import { ComingSoon } from '@/components/ComingSoon';
import { t } from '@/i18n';

/** Mode Apprendre : un set précis, ou tous les sets si aucun identifiant n'est fourni. */
export function LearnPage() {
  const { setId } = useParams();
  const title = setId ? t('study.modes.learn') : t('study.reviewAllTitle');

  return <ComingSoon title={title} milestone="milestones.m3" />;
}
