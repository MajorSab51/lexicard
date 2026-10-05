import { SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { t } from '@/i18n';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title={t('notFound.title')} />
      <EmptyState
        icon={SearchX}
        title={t('notFound.title')}
        body={t('notFound.body')}
        action={<ButtonLink to="/">{t('notFound.goHome')}</ButtonLink>}
      />
    </>
  );
}
