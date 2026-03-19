import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import * as Sentry from '@sentry/react';

const log = logger.create('ErrorHandler');

export interface AppError {
  type: 'auth' | 'validation' | 'network' | 'permission' | 'server' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  userMessage?: string;
}

export class ErrorHandler {
  static handle(error: any, context?: string): void {
    const appError = this.parseError(error, context);
    this.logError(appError, context, error);
    this.showUserMessage(appError);
  }

  static parseError(error: any, context?: string): AppError {
    // Handle Supabase errors
    if (error?.code) {
      switch (error.code) {
        case 'PGRST116':
          return {
            type: 'permission',
            message: 'Access denied - insufficient permissions',
            code: error.code,
            userMessage: 'You don\'t have permission to perform this action'
          };
        case 'PGRST301':
          return {
            type: 'validation',
            message: 'Invalid input data',
            code: error.code,
            userMessage: 'Please check your input and try again'
          };
        default:
          return {
            type: 'server',
            message: error.message || 'Database error',
            code: error.code,
            userMessage: 'A server error occurred. Please try again'
          };
      }
    }

    // Handle authentication errors
    if (error?.message?.includes('auth') || error?.message?.includes('token')) {
      return {
        type: 'auth',
        message: error.message,
        userMessage: 'Authentication required. Please log in again'
      };
    }

    // Handle network errors
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return {
        type: 'network',
        message: error.message,
        userMessage: 'Network error. Please check your connection'
      };
    }

    // Handle validation errors
    if (error?.message?.includes('required') || error?.message?.includes('invalid')) {
      return {
        type: 'validation',
        message: error.message,
        userMessage: 'Please check your input and try again'
      };
    }

    // Default error
    return {
      type: 'unknown',
      message: error?.message || String(error),
      userMessage: 'An unexpected error occurred. Please try again'
    };
  }

  static logError(appError: AppError, context?: string, originalError?: unknown): void {
    const errorData = {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      details: appError.details,
      context: context || 'Unknown',
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    if (import.meta.env.DEV) {
      log.error(`[${appError.type.toUpperCase()}] ${context || 'Unknown context'}`, originalError, errorData);
    }
    
    // In production, route through Sentry
    if (import.meta.env.PROD && (appError.type === 'server' || appError.type === 'unknown')) {
      if (originalError instanceof Error) {
        Sentry.captureException(originalError, { extra: errorData });
      } else {
        Sentry.captureMessage(`[${appError.type}] ${appError.message}`, {
          level: 'error',
          extra: errorData,
        });
      }
    }
  }

  static showUserMessage(error: AppError): void {
    const message = error.userMessage || error.message;
    
    switch (error.type) {
      case 'validation':
        toast.error(message, { duration: 4000 });
        break;
      case 'auth':
        toast.error(message, { 
          duration: 6000,
          action: {
            label: 'Login',
            onClick: () => window.location.href = '/login'
          }
        });
        break;
      case 'permission':
        toast.error(message, { duration: 5000 });
        break;
      case 'network':
        toast.error(message, {
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => window.location.reload()
          }
        });
        break;
      default:
        toast.error(message, { duration: 4000 });
    }
  }

  static createRetryWrapper<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const result = await operation();
          resolve(result);
          return;
        } catch (error) {
          if (i === maxRetries - 1) {
            reject(error);
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    });
  }
}
