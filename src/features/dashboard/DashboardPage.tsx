import { Layers, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { t } from '@/i18n';

export function DashboardPage() {
  return (
    <>
      <PageHeader title={t('dashboard.welcome')} subtitle={t('app.tagline')} />
      <EmptyState
        icon={Layers}
        title={t('dashboard.emptyTitle')}
        body={t('dashboard.emptyBody')}
        action={
          <ButtonLink to="/sets/new">
            <Plus aria-hidden="true" className="size-5" />
            {t('dashboard.createSet')}
          </ButtonLink>
        }
      />
    </>
  );
}
