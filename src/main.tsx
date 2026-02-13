import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './utils/serviceWorker';
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';

// Initialize Sentry error monitoring (only in production)
initSentry();

// Initialize PostHog analytics
initPostHog();

// Register service worker for PWA support
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
