import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import Dashboard from './Dashboard.tsx';
import Giveaway from './Giveaway.tsx';
import './index.css';

const searchParams = new URLSearchParams(window.location.search);
const selectedView = searchParams.get('view');

const isDashboard =
  selectedView === 'dashboard' ||
  window.location.hash === '#dashboard' ||
  window.location.hash === '#/dashboard';

const isGiveaway =
  selectedView === 'giveaway' ||
  window.location.hash === '#giveaway' ||
  window.location.hash === '#/giveaway';

function RootView() {
  if (isDashboard) return <Dashboard />;
  if (isGiveaway) return <Giveaway />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootView />
  </StrictMode>,
);
