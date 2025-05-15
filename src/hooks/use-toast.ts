
// Import the toast functions directly from sonner
import { toast as sonnerToast } from "sonner";
import * as React from 'react';
import { type ToastActionElement, type ToastProps } from '@/components/ui/toast';

// Define the ToasterToast type for the toast system
export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// Create a useToast hook with the proper return type
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([]);

  return {
    toasts,
    toast: ({ ...props }: ToasterToast) => {
      // The actual implementation is handled by sonner
      return sonnerToast(props.title as string, {
        description: props.description as string,
      });
    },
    dismiss: (toastId?: string) => {
      // Here we would remove a specific toast from the toasts array
      setToasts((toasts) => toasts.filter((toast) => toast.id !== toastId));
    },
  };
};

// Export the direct toast function for simpler usage
export const toast = sonnerToast;
