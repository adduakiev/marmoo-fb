import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import './index.css';

// Отримуємо всі можливі варіанти написання з адресного рядка
const href = window.location.href.toLowerCase();
const searchParams = new URLSearchParams(window.location.search);
const currentView = searchParams.get('view');
const hasHash = window.location.hash.toLowerCase() === '#dashboard';

// Якщо в URL є параметр view=dashboard, або хеш #dashboard, або просто слово dashboard в кінці шляху
const showDashboard = currentView === 'dashboard' || hasHash || href.includes('dashboard');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showDashboard ? (
      <Dashboard />
    ) : (
      <App />
    )}
  </StrictMode>,
);