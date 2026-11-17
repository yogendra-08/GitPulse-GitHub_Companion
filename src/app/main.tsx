import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Providers } from './Providers';
import { AppShell } from './AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import OverviewPage from '@/pages/OverviewPage';
import PullRequestsPage from '@/pages/PullRequestsPage';
import IssuesPage from '@/pages/IssuesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ReposPage from '@/pages/ReposPage';
import SettingsPage from '@/pages/SettingsPage';

// Charts are the heaviest dependency, so Analytics loads on demand.
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));

createRoot(document.getElementById('root')!).render(
  <Providers>
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="pulls" element={<PullRequestsPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="repos" element={<ReposPage />} />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </Providers>,
);
