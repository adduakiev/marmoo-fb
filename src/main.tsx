import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import FeedbackDashboard from './FeedbackDashboardGlobal.tsx';
import SalesDashboard from './SalesDashboardGlobal.tsx';
import MenuDashboard from './MenuDashboard.tsx';
import ChannelDashboard from './ChannelDashboard.tsx';
import ExecutiveDashboard from './ExecutiveDashboard.tsx';
import DaypartDashboard from './DaypartDashboard.tsx';
import WeekdayDashboard from './WeekdayDashboard.tsx';
import CategoryDashboard from './CategoryDashboard.tsx';
import ReviewManagementDashboard from './ReviewManagementDashboard.tsx';
import IntelligenceNav from './components/IntelligenceNav.tsx';
import GlobalFilterBar from './components/GlobalFilterBar.tsx';
import ExecutiveSignals from './components/ExecutiveSignals.tsx';
import DataQualityPanel from './components/DataQualityPanel.tsx';
import { FilterProvider } from './context/FilterContext.tsx';
import './index.css';

type RouteName = 'form' | 'dashboard' | 'dashboard_reviews' | 'dashboard_sales' | 'dashboard_menu' | 'dashboard_channels' | 'dashboard_executive' | 'dashboard_daypart' | 'dashboard_weekday' | 'dashboard_categories';
type IntelligenceRoute = Exclude<RouteName, 'form'>;

const INTELLIGENCE_ROUTES = new Set<IntelligenceRoute>([
  'dashboard',
  'dashboard_reviews',
  'dashboard_sales',
  'dashboard_menu',
  'dashboard_channels',
  'dashboard_executive',
  'dashboard_daypart',
  'dashboard_weekday',
  'dashboard_categories',
]);

function asRoute(value: string | null | undefined): RouteName | null {
  if (!value) return null;
  const normalized = value.trim() as IntelligenceRoute;
  return INTELLIGENCE_ROUTES.has(normalized) ? normalized : null;
}

function resolveRoute(): RouteName {
  const searchParams = new URLSearchParams(window.location.search);
  const hashRoute = asRoute(window.location.hash.replace(/^#\/?/, '').replace(/\?.*$/, ''));
  const queryRoute = asRoute(searchParams.get('view'));

  // Prefer the hash when both are present so old links like
  // ?view=dashboard_reviews#dashboard_executive still navigate correctly.
  return hashRoute || queryRoute || 'form';
}

function IntelligenceShell({ route, children }: { route: IntelligenceRoute; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#4c061c]">
      <IntelligenceNav active={route} />
      {route !== 'dashboard_reviews' && <GlobalFilterBar route={route} />}
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
  if (route === 'dashboard_reviews') return <IntelligenceShell route={route}><ReviewManagementDashboard /></IntelligenceShell>;
  if (route === 'dashboard_categories') return <IntelligenceShell route={route}><CategoryDashboard /></IntelligenceShell>;
  if (route === 'dashboard_weekday') return <IntelligenceShell route={route}><WeekdayDashboard /></IntelligenceShell>;
  if (route === 'dashboard_daypart') return <IntelligenceShell route={route}><DaypartDashboard /></IntelligenceShell>;
  if (route === 'dashboard_executive') return <IntelligenceShell route={route}><ExecutiveDashboard /><ExecutiveSignals /><DataQualityPanel /></IntelligenceShell>;
  if (route === 'dashboard_channels') return <IntelligenceShell route={route}><ChannelDashboard /></IntelligenceShell>;
  if (route === 'dashboard_menu') return <IntelligenceShell route={route}><MenuDashboard /></IntelligenceShell>;
  if (route === 'dashboard_sales') return <IntelligenceShell route={route}><SalesDashboard /></IntelligenceShell>;
  if (route === 'dashboard') return <IntelligenceShell route={route}><FeedbackDashboard /></IntelligenceShell>;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FilterProvider>
      <RouteRoot />
    </FilterProvider>
  </StrictMode>
);
