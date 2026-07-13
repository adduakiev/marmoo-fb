import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import './index.css';

const searchParams = new URLSearchParams(window.location.search);
const isDashboardParam = searchParams.get('view') === 'dashboard';
const isDashboardHash = window.location.hash === '#dashboard' || window.location.hash === '#/dashboard';

const shouldShowDashboard = isDashboardParam || isDashboardHash;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shouldShowDashboard ? <Dashboard /> : <App />}
  </StrictMode>
);