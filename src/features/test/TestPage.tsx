import { ComingSoon } from '@/components/ComingSoon';
import { t } from '@/i18n';

export function TestPage() {
  return <ComingSoon title={t('study.modes.test')} milestone="milestones.m4" />;
}
