
import { useState, useEffect, useRef } from 'react';
import { type ToastProps } from '@/components/ui/toast';

type ToastActionElement = React.ReactElement;

export type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive';
}

export const TOAST_LIMIT = 5;
export const TOAST_REMOVE_DELAY = 1_000_000;

export type ToastOptions = Omit<ToasterToast, "id">;

interface State {
  toasts: ToasterToast[];
}

// Create a unique ID for each toast
const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

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
}

export const useToast = () => {
  const [state, setState] = useState<State>({
    toasts: [],
  });

  // Reference to avoid stale closures
  const stateRef = useRef<State>({ toasts: [] });
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dismiss = (toastId?: string) => {
    if (toastId) {
      setState((prev) => ({
        toasts: prev.toasts.filter((toast) => toast.id !== toastId),
      }));
    } else {
      setState((prev) => ({
        toasts: [],
      }));
    }
  };

  // Override all toast methods to update state
  const toastMethods = {
    ...toast,
    dismiss,
    error: (message: string, options?: ToastOptions) => {
      const id = toast.error(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          { 
            id, 
            title: options?.title, 
            description: message, 
            action: options?.action, 
            variant: 'destructive' as const
          },
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    success: (message: string, options?: ToastOptions) => {
      const id = toast.success(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          { 
            id, 
            title: options?.title, 
            description: message, 
            action: options?.action, 
            variant: 'default' as const
          },
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    warn: (message: string, options?: ToastOptions) => {
      const id = toast.warn(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          { 
            id, 
            title: options?.title, 
            description: message, 
            action: options?.action, 
            variant: 'default' as const
          },
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    info: (message: string, options?: ToastOptions) => {
      const id = toast.info(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          { 
            id, 
            title: options?.title, 
            description: message, 
            action: options?.action, 
            variant: 'default' as const
          },
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    loading: (message: string, options?: ToastOptions) => {
      const id = toast.loading(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          { 
            id, 
            title: options?.title, 
            description: message, 
            action: options?.action, 
            variant: 'default' as const 
          },
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
  };

  return {
    ...toastMethods,
    toasts: state.toasts,
  };
};

export type { ToastActionElement };
