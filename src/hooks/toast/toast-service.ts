
import { ToastOptions } from './types';
import { generateId } from './toast-utils';

// The base toast service with methods that don't depend on React state
export const toast = {
  // Method to remove a toast by ID
  dismiss: (toastId?: string) => {
    // This will be implemented by the useToast() hook
  },
  
  // Toast variants
  error: (message: string, options?: ToastOptions) => {
    const id = generateId();
    return id;
  },
  
  success: (message: string, options?: ToastOptions) => {
    const id = generateId();
    return id;
  },
  
  warn: (message: string, options?: ToastOptions) => {
    const id = generateId();
    return id;
  },
  
  info: (message: string, options?: ToastOptions) => {
    const id = generateId();
    return id;
  },
  
  loading: (message: string, options?: ToastOptions) => {
    const id = generateId();
    return id;
  },
};
