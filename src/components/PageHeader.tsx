import { useEffect, type ReactNode } from 'react';
import { t } from '@/i18n';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Titre de page : met aussi à jour le titre de l'onglet du navigateur. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · ${t('app.name')}`;
  }, [title]);

  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
