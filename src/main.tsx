import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import SalesDashboard from './SalesDashboard.tsx';
import './index.css';

type RouteName = 'form' | 'dashboard' | 'dashboard_sales';

function resolveRoute(): RouteName {
  const searchParams = new URLSearchParams(window.location.search);
  const viewParam = searchParams.get('view');
  const hash = window.location.hash
    .replace(/^#\/?/, '')
    .replace(/\?.*$/, '')
    .trim();

  if (viewParam === 'dashboard_sales' || hash === 'dashboard_sales') {
    return 'dashboard_sales';
  }

  if (viewParam === 'dashboard' || hash === 'dashboard') {
    return 'dashboard';
  }

  return 'form';
}

function RouteRoot() {
  const [route, setRoute] = useState<RouteName>(() => resolveRoute());

  useEffect(() => {
    const syncRoute = () => setRoute(resolveRoute());

    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  if (route === 'dashboard_sales') {
    return <SalesDashboard />;
  }

  if (route === 'dashboard') {
    return <Dashboard />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouteRoot />
  </StrictMode>
);
