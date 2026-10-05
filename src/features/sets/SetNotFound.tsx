import { SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { t } from '@/i18n';

export function SetNotFound() {
  return (
    <>
      <PageHeader title={t('setDetail.notFoundTitle')} />
      <EmptyState
        icon={SearchX}
        title={t('setDetail.notFoundTitle')}
        body={t('setDetail.notFoundBody')}
        action={<ButtonLink to="/sets">{t('setDetail.backToSets')}</ButtonLink>}
      />
    </>
  );
}
