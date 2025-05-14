
import { toast } from 'sonner';

// Re-export the toast function from sonner
export { toast };

// Export a useToast hook for compatibility with existing code
export const useToast = () => {
  return {
    toast: {
      // Map toast functions to sonner's toast functions
      error: (message: string) => toast.error(message),
      success: (message: string) => toast.success(message),
      info: (message: string) => toast.info(message),
      warning: (message: string) => toast.warning(message),
    }
  };
};
