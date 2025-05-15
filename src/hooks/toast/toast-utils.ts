
import { ToastOptions } from './types';

// Create a unique ID for each toast
export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

// Core toast creation function
export const createToast = (message: string, options?: ToastOptions, variant = 'default' as const) => {
  const id = generateId();
  return {
    id,
    title: options?.title,
    description: message,
    action: options?.action,
    variant
  };
};
