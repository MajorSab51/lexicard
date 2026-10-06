import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Outlet, useMatches, useParams } from 'react-router';
import { t, type MessageKey } from '@/i18n';

export interface StudyRouteHandle {
  titleKey: MessageKey;
}

function isStudyHandle(handle: unknown): handle is StudyRouteHandle {
  return typeof handle === 'object' && handle !== null && 'titleKey' in handle;
}

/** Mise en page plein écran des modes d'étude : pas de navigation, une sortie claire. */
export function StudyLayout() {
  const { setId } = useParams();
  const handle = useMatches()
    .map((match) => match.handle)
    .findLast(isStudyHandle);
  const exitTo = setId ? `/sets/${setId}` : '/';
  const title = handle ? t(handle.titleKey) : null;

  useEffect(() => {
    if (title) document.title = `${title} · ${t('app.name')}`;
  }, [title]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-surface px-2 md:px-4">
        <Link
          to={exitTo}
          aria-label={t('study.exit')}
          className="flex size-11 items-center justify-center rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg"
        >
          <X aria-hidden="true" className="size-6" />
        </Link>
        {title && <span className="font-semibold">{title}</span>}
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
