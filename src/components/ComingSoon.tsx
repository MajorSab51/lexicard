import { Construction } from 'lucide-react';
import { t, type MessageKey } from '@/i18n';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

interface ComingSoonProps {
  title: string;
  milestone: Extract<MessageKey, `milestones.${string}`>;
}

/** Écran provisoire affiché tant que la fonctionnalité n'est pas livrée. */
export function ComingSoon({ title, milestone }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={Construction} title={t('common.comingSoon', { milestone: t(milestone) })} />
    </>
  );
}
