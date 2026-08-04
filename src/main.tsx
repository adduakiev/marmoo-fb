import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import SalesDashboard from './SalesDashboardV4.tsx';
import MenuDashboard from './MenuDashboard.tsx';
import ChannelDashboard from './ChannelDashboard.tsx';
import IntelligenceNav from './components/IntelligenceNav.tsx';
import './index.css';

type RouteName = 'form' | 'dashboard' | 'dashboard_sales' | 'dashboard_menu' | 'dashboard_channels';
type IntelligenceRoute = Exclude<RouteName, 'form'>;

function resolveRoute(): RouteName {
  const searchParams = new URLSearchParams(window.location.search);
  const viewParam = searchParams.get('view');
  const hash = window.location.hash
    .replace(/^#\/?/, '')
    .replace(/\?.*$/, '')
    .trim();

  if (viewParam === 'dashboard_channels' || hash === 'dashboard_channels') return 'dashboard_channels';
  if (viewParam === 'dashboard_menu' || hash === 'dashboard_menu') return 'dashboard_menu';
  if (viewParam === 'dashboard_sales' || hash === 'dashboard_sales') return 'dashboard_sales';
  if (viewParam === 'dashboard' || hash === 'dashboard') return 'dashboard';
  return 'form';
}

function IntelligenceShell({ route, children }: { route: IntelligenceRoute; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#4c061c]">
      <IntelligenceNav active={route} />
      {children}
    </div>
  );
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

  if (route === 'dashboard_channels') {
    return <IntelligenceShell route={route}><ChannelDashboard /></IntelligenceShell>;
  }
  if (route === 'dashboard_menu') {
    return <IntelligenceShell route={route}><MenuDashboard /></IntelligenceShell>;
  }
  if (route === 'dashboard_sales') {
    return <IntelligenceShell route={route}><SalesDashboard /></IntelligenceShell>;
  }
  if (route === 'dashboard') {
    return <IntelligenceShell route={route}><Dashboard /></IntelligenceShell>;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouteRoot />
  </StrictMode>
);
