
import { type ToastProps } from '@/components/ui/toast';

// Re-export everything from the refactored toast module
export { 
  useToast, 
  toast, 
  type ToasterToast, 
  type ToastActionElement, 
  TOAST_LIMIT,
  TOAST_REMOVE_DELAY
} from './toast';
