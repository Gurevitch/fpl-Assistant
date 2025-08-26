import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import LineupPage from './pages/LineupPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LineupPage />
  </StrictMode>
);
