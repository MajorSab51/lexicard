import { NavLink, Outlet } from 'react-router';
import { Logo } from '@/components/Logo';
import { t } from '@/i18n';
import { NAV_ITEMS } from './navigation';

/**
 * Mise en page des écrans de navigation.
 * Mobile : barre d'onglets fixée en bas (accessible au pouce). Ordinateur : barre latérale.
 */
export function AppLayout() {
  return (
    <div className="min-h-dvh md:flex">
      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-t-0 md:border-r md:pb-0"
      >
        <div className="hidden items-center gap-2 px-5 py-6 md:flex">
          <Logo />
          <span className="text-lg font-bold">{t('app.name')}</span>
        </div>
        <ul className="grid grid-cols-4 md:grid-cols-1 md:gap-1 md:px-3">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors md:h-auto md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-base ${
                    isActive
                      ? 'text-primary md:bg-primary-soft md:text-on-primary-soft'
                      : 'text-fg-muted hover:text-fg md:hover:bg-surface-muted'
                  }`
                }
              >
                <Icon aria-hidden="true" className="size-6 md:size-5" />
                <span>{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 outline-none md:px-8 md:pt-10 md:pb-10"
      >
        <Outlet />
      </main>
    </div>
  );
}
