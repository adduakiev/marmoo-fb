import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import './index.css';

// Витягуємо параметри з URL-рядка
const searchParams = new URLSearchParams(window.location.search);
const currentView = searchParams.get('view');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {currentView === 'dashboard' ? (
      <Dashboard />
    ) : (
      <App />
    )}
  </StrictMode>,
);