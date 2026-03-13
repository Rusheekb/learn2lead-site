import * as Sentry from '@sentry/react';

type LogContext = string;

interface LogMeta {
  [key: string]: unknown;
}

const COLORS = {
  debug: '#9CA3AF',
  info: '#3B82F6',
  warn: '#F59E0B',
  error: '#EF4444',
} as const;

function createLogger(context: LogContext) {
  const prefix = `[${context}]`;

  return {
    debug(message: string, meta?: LogMeta) {
      if (import.meta.env.DEV) {
        console.log(`%c${prefix} ${message}`, `color: ${COLORS.debug}`, meta ?? '');
      }
      // Suppressed in production
    },

    info(message: string, meta?: LogMeta) {
      if (import.meta.env.DEV) {
        console.log(`%c${prefix} ${message}`, `color: ${COLORS.info}`, meta ?? '');
      }
      // Suppressed in production
    },

    warn(message: string, meta?: LogMeta) {
      if (import.meta.env.DEV) {
        console.warn(`${prefix} ${message}`, meta ?? '');
      } else {
        Sentry.captureMessage(`${prefix} ${message}`, {
          level: 'warning',
          extra: meta as Record<string, unknown>,
        });
      }
    },

    error(message: string, error?: unknown, meta?: LogMeta) {
      if (import.meta.env.DEV) {
        console.error(`${prefix} ${message}`, error ?? '', meta ?? '');
      } else {
        if (error instanceof Error) {
          Sentry.captureException(error, {
            extra: { context, message, ...meta },
          });
        } else {
          Sentry.captureMessage(`${prefix} ${message}`, {
            level: 'error',
            extra: { error, ...meta },
          });
        }
      }
    },
  };
}

export const logger = {
  create: createLogger,
};

export type Logger = ReturnType<typeof createLogger>;
