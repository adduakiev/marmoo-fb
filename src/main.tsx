import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import './index.css';

// 1. Перевіряємо параметри запиту (?view=dashboard)
const searchParams = new URLSearchParams(window.location.search);
const isDashboardParam = searchParams.get('view') === 'dashboard';

// 2. Перевіряємо хеш у URL (#dashboard)
const isDashboardHash = window.location.hash === '#dashboard' || window.location.hash === '#/dashboard';

// Якщо спрацював хоча б один із варіантів — вмикаємо BI-панель
const shouldShowDashboard = isDashboardParam || isDashboardHash;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shouldShowDashboard ? (
      <Dashboard />
    ) : (
      <App />
    )}
  </StrictMode>,
);