import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import SalesDashboard from './SalesDashboard.tsx';
import './index.css';

const searchParams = new URLSearchParams(window.location.search);
const viewParam = searchParams.get('view');
const hash = window.location.hash.replace(/^#\/?/, '');

const shouldShowSalesDashboard =
  viewParam === 'dashboard_sales' ||
  hash === 'dashboard_sales';

const shouldShowDashboard =
  viewParam === 'dashboard' ||
  hash === 'dashboard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shouldShowSalesDashboard ? (
      <SalesDashboard />
    ) : shouldShowDashboard ? (
      <Dashboard />
    ) : (
      <App />
    )}
  </StrictMode>
);
