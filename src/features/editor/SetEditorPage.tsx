import { useParams } from 'react-router';
import { ComingSoon } from '@/components/ComingSoon';
import { t } from '@/i18n';

export function SetEditorPage() {
  const { setId } = useParams();
  const title = setId ? t('editor.editTitle') : t('editor.createTitle');

  return <ComingSoon title={title} milestone="milestones.m1" />;
}
