import type { RouteObject } from 'react-router';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SetEditorPage } from '@/features/editor/SetEditorPage';
import { FlashcardsPage } from '@/features/flashcards/FlashcardsPage';
import { LearnPage } from '@/features/learn/LearnPage';
import { MatchPage } from '@/features/match/MatchPage';
import { SetDetailPage } from '@/features/sets/SetDetailPage';
import { SetListPage } from '@/features/sets/SetListPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatsPage } from '@/features/stats/StatsPage';
import { TestPage } from '@/features/test/TestPage';
import { WritePage } from '@/features/write/WritePage';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';
import { RootLayout } from './RootLayout';
import { StudyLayout, type StudyRouteHandle } from './StudyLayout';

const study = (titleKey: StudyRouteHandle['titleKey']): StudyRouteHandle => ({ titleKey });

/** Arbre des routes, partagé entre l'application et les tests. */
export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, Component: DashboardPage },
          { path: 'sets', Component: SetListPage },
          { path: 'sets/new', Component: SetEditorPage },
          { path: 'sets/:setId', Component: SetDetailPage },
          { path: 'sets/:setId/edit', Component: SetEditorPage },
          { path: 'stats', Component: StatsPage },
          { path: 'settings', Component: SettingsPage },
          { path: '*', Component: NotFoundPage },
        ],
      },
      {
        Component: StudyLayout,
        children: [
          { path: 'learn', Component: LearnPage, handle: study('study.reviewAllTitle') },
          {
            path: 'sets/:setId',
            children: [
              {
                path: 'flashcards',
                Component: FlashcardsPage,
                handle: study('study.modes.flashcards'),
              },
              { path: 'learn', Component: LearnPage, handle: study('study.modes.learn') },
              { path: 'write', Component: WritePage, handle: study('study.modes.write') },
              { path: 'test', Component: TestPage, handle: study('study.modes.test') },
              { path: 'match', Component: MatchPage, handle: study('study.modes.match') },
            ],
          },
        ],
      },
    ],
  },
];
