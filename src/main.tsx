import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './store/AppContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);

// PWA: service worker para funcionar offline (somente no build de produção)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
