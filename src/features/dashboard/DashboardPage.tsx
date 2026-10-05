import { Layers, Plus, Upload } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useCardCounts, useSets } from '@/data/hooks';
import { SetSummaryCard } from '@/features/sets/SetSummaryCard';
import { t } from '@/i18n';

const RECENT_COUNT = 4;

export function DashboardPage() {
  const sets = useSets();
  const counts = useCardCounts();

  const actions = (
    <>
      <ButtonLink variant="secondary" to="/import">
        <Upload aria-hidden="true" className="size-5" />
        {t('dashboard.importCards')}
      </ButtonLink>
      <ButtonLink to="/sets/new">
        <Plus aria-hidden="true" className="size-5" />
        {t('dashboard.createSet')}
      </ButtonLink>
    </>
  );

  if (!sets || !counts) return <Loading />;

  if (sets.length === 0) {
    return (
      <>
        <PageHeader title={t('dashboard.welcome')} subtitle={t('app.tagline')} />
        <EmptyState
          icon={Layers}
          title={t('dashboard.emptyTitle')}
          body={t('dashboard.emptyBody')}
          action={<div className="flex flex-wrap justify-center gap-2">{actions}</div>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('dashboard.welcome')} subtitle={t('app.tagline')} actions={actions} />
      <section aria-labelledby="recent-sets">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent-sets" className="text-lg font-semibold">
            {t('dashboard.recentSets')}
          </h2>
          <Link to="/sets" className="text-sm font-medium text-primary hover:underline">
            {t('dashboard.seeAll')}
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {sets.slice(0, RECENT_COUNT).map((set) => (
            <li key={set.id}>
              <SetSummaryCard set={set} cardCount={counts.get(set.id) ?? 0} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
