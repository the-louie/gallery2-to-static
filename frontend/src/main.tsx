import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider, ViewModeProvider } from './contexts';
import App from './App';
import './styles/themes.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <ViewModeProvider>
          <App />
        </ViewModeProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
);
