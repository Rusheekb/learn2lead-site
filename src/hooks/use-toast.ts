
// Import Sonner's toast function
import { toast as sonnerToast } from 'sonner';
import * as React from 'react';
import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

// Re-export the direct toast function for convenience
export const toast = sonnerToast;

// Define the ToasterToast type for compatibility
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// Create a useToast hook that returns both direct toast and object-style methods 
export const useToast = () => {
  return {
    // Return the toast function itself so it can be called directly
    toast: (props: { title?: string; description?: string; variant?: "default" | "destructive" }) => {
      return sonnerToast(props.title || "", {
        description: props.description,
        // Map variant to Sonner's types
        ...(props.variant === "destructive" ? { style: { backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" } } : {})
      });
    },
    // Maintain the object structure for backward compatibility
    toasts: [] as ToasterToast[],
    dismiss: () => {} // No-op for compatibility
  };
};
