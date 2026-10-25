import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './styles/themes.css';
import './styles/global.css';
import { legacyPathToHash } from './utils/legacyPathRedirect';
import { initErrorReporting } from './utils/errorReporting';

// Old lanbilder.se path URLs -> hash URLs before the router reads the location (LOGIC-32)
const legacyTarget = legacyPathToHash(window.location);
if (legacyTarget) window.history.replaceState(null, '', legacyTarget);

// Sentry, only when the build sets VITE_SENTRY_DSN (SENTRY-01); loads as its own chunk
void initErrorReporting().catch((err) => console.warn('Error reporting not started:', err));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>
);
