
import { Toast, ToastActionElement, ToastProps } from '@/components/ui/toast';

type ToasterToast = Toast & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
}

export const TOAST_LIMIT = 5;
export const TOAST_REMOVE_DELAY = 1_000_000;

export type ToastOptions = Omit<ToasterToast, "id">;

export interface ToastState {
  toasts: ToasterToast[];
}

export const toast = {
  toaster: (props: ToastProps) => {},
  dismiss: (toastId?: string) => {},
  error: (message: string, options?: ToastOptions) => {},
  success: (message: string, options?: ToastOptions) => {},
  warn: (message: string, options?: ToastOptions) => {},
  info: (message: string, options?: ToastOptions) => {},
  loading: (message: string, options?: ToastOptions) => {},
}

export const useToast = () => {
  return {
    toast,
    dismiss: toast.dismiss,
    toasts: []
  }
}

export type { ToasterToast }
