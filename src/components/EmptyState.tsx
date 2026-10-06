import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  /** Contenu complémentaire, affiché entre le texte et l’action. */
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, children, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft">
        <Icon aria-hidden="true" className="size-7" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="mt-2 max-w-sm text-fg-muted">{body}</p>}
      {children}
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
