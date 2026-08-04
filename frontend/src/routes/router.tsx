import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { Spinner } from '../components/ui/Spinner.js';
import { AppShell } from '../components/layout/AppShell.js';
import { GuestRoute, ProtectedRoute } from './ProtectedRoute.js';

const LoginPage = lazy(() =>
  import('../pages/LoginPage.js').then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/DashboardPage.js').then((module) => ({ default: module.DashboardPage })),
);
const OffersPage = lazy(() =>
  import('../pages/OffersPage.js').then((module) => ({ default: module.OffersPage })),
);
const OfferDetailPage = lazy(() =>
  import('../pages/OfferDetailPage.js').then((module) => ({ default: module.OfferDetailPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/SettingsPage.js').then((module) => ({ default: module.SettingsPage })),
);
const TemplatePage = lazy(() =>
  import('../pages/TemplatePage.js').then((module) => ({ default: module.TemplatePage })),
);
const CouponsPage = lazy(() =>
  import('../pages/CouponsPage.js').then((module) => ({ default: module.CouponsPage })),
);
const LogsPage = lazy(() =>
  import('../pages/LogsPage.js').then((module) => ({ default: module.LogsPage })),
);

function LazyPage({ children }: { readonly children: ReactNode }) {
  return <Suspense fallback={<Spinner label="Carregando…" />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: (
          <LazyPage>
            <LoginPage />
          </LazyPage>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: (
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            ),
          },
          {
            path: 'offers',
            element: (
              <LazyPage>
                <OffersPage />
              </LazyPage>
            ),
          },
          {
            path: 'offers/:id',
            element: (
              <LazyPage>
                <OfferDetailPage />
              </LazyPage>
            ),
          },
          {
            path: 'settings',
            element: (
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            ),
          },
          {
            path: 'template',
            element: (
              <LazyPage>
                <TemplatePage />
              </LazyPage>
            ),
          },
          {
            path: 'coupons',
            element: (
              <LazyPage>
                <CouponsPage />
              </LazyPage>
            ),
          },
          {
            path: 'logs',
            element: (
              <LazyPage>
                <LogsPage />
              </LazyPage>
            ),
          },
          { path: 'accounts', element: <Navigate to="/settings#integracoes" replace /> },
          { path: 'sources/:channel', element: <Navigate to="/settings#coleta" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
