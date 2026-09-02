import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ColorModeProvider } from './theme/ColorModeContext';
import { AuthProvider } from './auth/AuthContext';
import { SyncProvider } from './offline/SyncProvider';
import App from './App';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SyncProvider>
            <App />
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </ColorModeProvider>
  </StrictMode>,
);
