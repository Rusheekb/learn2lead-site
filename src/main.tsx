import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorker';
import { initSentry } from './lib/sentry';

// Initialize Sentry error monitoring (only in production)
initSentry();

// Register service worker for PWA support
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
