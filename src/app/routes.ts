import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { Loading } from '@/components/Loading';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SetDetailPage } from '@/features/sets/SetDetailPage';
import { SetListPage } from '@/features/sets/SetListPage';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';
import { RootLayout } from './RootLayout';
import { StudyLayout, type StudyRouteHandle } from './StudyLayout';

const study = (titleKey: StudyRouteHandle['titleKey']): StudyRouteHandle => ({ titleKey });

/**
 * Chargement à la demande d'un écran secondaire, pour alléger le premier affichage.
 * L'accueil, la liste et le détail des sets restent dans le bundle principal.
 */
function lazyPage<Module>(load: () => Promise<Module>, pick: (module: Module) => ComponentType) {
  return async () => ({ Component: pick(await load()) });
}

const editor = lazyPage(
  () => import('@/features/editor/SetEditorPage'),
  (m) => m.SetEditorPage,
);
const learn = lazyPage(
  () => import('@/features/learn/LearnPage'),
  (m) => m.LearnPage,
);

/** Arbre des routes, partagé entre l'application et les tests. */
export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    HydrateFallback: Loading,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, Component: DashboardPage },
          { path: 'sets', Component: SetListPage },
          { path: 'sets/new', lazy: editor },
          { path: 'sets/:setId', Component: SetDetailPage },
          { path: 'sets/:setId/edit', lazy: editor },
          {
            path: 'import',
            lazy: lazyPage(
              () => import('@/features/import/ImportPage'),
              (m) => m.ImportPage,
            ),
          },
          {
            path: 'stats',
            lazy: lazyPage(
              () => import('@/features/stats/StatsPage'),
              (m) => m.StatsPage,
            ),
          },
          {
            path: 'settings',
            lazy: lazyPage(
              () => import('@/features/settings/SettingsPage'),
              (m) => m.SettingsPage,
            ),
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
      {
        Component: StudyLayout,
        children: [
          { path: 'learn', lazy: learn, handle: study('study.reviewAllTitle') },
          {
            path: 'sets/:setId',
            children: [
              {
                path: 'flashcards',
                lazy: lazyPage(
                  () => import('@/features/flashcards/FlashcardsPage'),
                  (m) => m.FlashcardsPage,
                ),
                handle: study('study.modes.flashcards'),
              },
              { path: 'learn', lazy: learn, handle: study('study.modes.learn') },
              {
                path: 'write',
                lazy: lazyPage(
                  () => import('@/features/write/WritePage'),
                  (m) => m.WritePage,
                ),
                handle: study('study.modes.write'),
              },
              {
                path: 'test',
                lazy: lazyPage(
                  () => import('@/features/test/TestPage'),
                  (m) => m.TestPage,
                ),
                handle: study('study.modes.test'),
              },
              {
                path: 'match',
                lazy: lazyPage(
                  () => import('@/features/match/MatchPage'),
                  (m) => m.MatchPage,
                ),
                handle: study('study.modes.match'),
              },
            ],
          },
        ],
      },
    ],
  },
];
