import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import './styles/app.css';
import App from './App';
import { AppStore } from './store/AppStore';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStore>
      <App />
    </AppStore>
  </StrictMode>,
);
