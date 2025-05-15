
import { useState, useEffect, useRef } from 'react';
import { ToastState, ToastOptions, ToasterToast, TOAST_LIMIT } from './types';
import { toast } from './toast-service';
import { createToast } from './toast-utils';

export const useToast = () => {
  const [state, setState] = useState<ToastState>({
    toasts: [],
  });

  // Reference to avoid stale closures
  const stateRef = useRef<ToastState>({ toasts: [] });
  
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
          createToast(message, options, 'destructive' as const)
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    success: (message: string, options?: ToastOptions) => {
      const id = toast.success(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          createToast(message, options, 'default' as const)
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    warn: (message: string, options?: ToastOptions) => {
      const id = toast.warn(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          createToast(message, options, 'default' as const)
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    info: (message: string, options?: ToastOptions) => {
      const id = toast.info(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          createToast(message, options, 'default' as const)
        ].slice(-TOAST_LIMIT),
      }));
      return id;
    },
    loading: (message: string, options?: ToastOptions) => {
      const id = toast.loading(message, options);
      setState((prev) => ({
        toasts: [
          ...prev.toasts,
          createToast(message, options, 'default' as const)
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

export type { ToasterToast, ToastActionElement } from './types';
export { toast } from './toast-service';
