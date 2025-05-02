
// Import i18n first to ensure it's loaded before any components that might use it
import './i18n';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
