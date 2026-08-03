import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ColorModeProvider } from './theme/ColorModeContext';
import App from './App';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </StrictMode>,
);
