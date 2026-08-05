import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import SalesDashboard from './SalesDashboardV4.tsx';
import MenuDashboard from './MenuDashboard.tsx';
import ChannelDashboard from './ChannelDashboard.tsx';
import ExecutiveDashboard from './ExecutiveDashboard.tsx';
import DaypartDashboard from './DaypartDashboard.tsx';
import WeekdayDashboard from './WeekdayDashboard.tsx';
import CategoryDashboard from './CategoryDashboard.tsx';
import IntelligenceNav from './components/IntelligenceNav.tsx';
import GlobalFilterBar from './components/GlobalFilterBar.tsx';
import ExecutiveSignals from './components/ExecutiveSignals.tsx';
import { FilterProvider } from './context/FilterContext.tsx';
import './index.css';

type RouteName = 'form' | 'dashboard' | 'dashboard_sales' | 'dashboard_menu' | 'dashboard_channels' | 'dashboard_executive' | 'dashboard_daypart' | 'dashboard_weekday' | 'dashboard_categories';
type IntelligenceRoute = Exclude<RouteName, 'form'>;

function resolveRoute(): RouteName {
  const searchParams = new URLSearchParams(window.location.search);
  const viewParam = searchParams.get('view');
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/\?.*$/, '').trim();
  if (viewParam === 'dashboard_categories' || hash === 'dashboard_categories') return 'dashboard_categories';
  if (viewParam === 'dashboard_weekday' || hash === 'dashboard_weekday') return 'dashboard_weekday';
  if (viewParam === 'dashboard_daypart' || hash === 'dashboard_daypart') return 'dashboard_daypart';
  if (viewParam === 'dashboard_executive' || hash === 'dashboard_executive') return 'dashboard_executive';
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
      <GlobalFilterBar />
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
  if (route === 'dashboard_categories') return <IntelligenceShell route={route}><CategoryDashboard /></IntelligenceShell>;
  if (route === 'dashboard_weekday') return <IntelligenceShell route={route}><WeekdayDashboard /></IntelligenceShell>;
  if (route === 'dashboard_daypart') return <IntelligenceShell route={route}><DaypartDashboard /></IntelligenceShell>;
  if (route === 'dashboard_executive') return <IntelligenceShell route={route}><ExecutiveDashboard /><ExecutiveSignals /></IntelligenceShell>;
  if (route === 'dashboard_channels') return <IntelligenceShell route={route}><ChannelDashboard /></IntelligenceShell>;
  if (route === 'dashboard_menu') return <IntelligenceShell route={route}><MenuDashboard /></IntelligenceShell>;
  if (route === 'dashboard_sales') return <IntelligenceShell route={route}><SalesDashboard /></IntelligenceShell>;
  if (route === 'dashboard') return <IntelligenceShell route={route}><Dashboard /></IntelligenceShell>;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FilterProvider>
      <RouteRoot />
    </FilterProvider>
  </StrictMode>
);
