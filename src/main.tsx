import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';

// Initialize Sentry error monitoring (only in production)
initSentry();

// Initialize PostHog analytics
initPostHog();

createRoot(document.getElementById('root')!).render(<App />);
