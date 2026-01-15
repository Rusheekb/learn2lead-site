import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error monitoring
 * Only initializes in production when DSN is available
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Only initialize in production with a valid DSN
  if (!dsn || import.meta.env.DEV) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] Skipping initialization in development mode');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Sample rate for transactions (performance monitoring)
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Session replay sample rates
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Ignore network errors that are expected
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Skip common non-actionable errors
        if (
          message.includes('failed to fetch') ||
          message.includes('network request failed') ||
          message.includes('load failed') ||
          message.includes('cancelled')
        ) {
          return null;
        }
      }
      
      return event;
    },
    
    // Don't send PII
    sendDefaultPii: false,
  });
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (import.meta.env.DEV) {
    console.error('[Sentry] Would capture:', error, context);
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message for debugging
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (import.meta.env.DEV) {
    console.log(`[Sentry] Would capture message (${level}):`, message);
    return;
  }
  
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string } | null) => {
  if (import.meta.env.DEV) {
    console.log('[Sentry] Would set user:', user);
    return;
  }
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging context
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  if (import.meta.env.DEV) {
    return;
  }
  
  Sentry.addBreadcrumb(breadcrumb);
};

// Re-export Sentry's ErrorBoundary for use in the app
export const SentryErrorBoundary = Sentry.ErrorBoundary;
