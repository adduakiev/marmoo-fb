import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import './index.css';

// Простий та надійний роутинг на основі поточного шляху в URL
const currentPath = window.location.pathname;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {currentPath.endsWith('/dashboard') || currentPath.endsWith('/dashboard/') ? (
      <Dashboard />
    ) : (
      <App />
    )}
  </StrictMode>,
);