/**
 * Retry utility with exponential backoff for critical network operations.
 * 
 * Only retries on transient/network errors — NOT on business logic failures
 * (e.g. insufficient credits, validation errors).
 */

export interface RetryOptions {
  /** Max number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 500) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 10000) */
  maxDelay?: number;
  /** Jitter factor 0-1 to randomize delay (default: 0.3) */
  jitter?: number;
  /** Called before each retry with attempt number and error */
  onRetry?: (attempt: number, error: unknown) => void;
  /** Predicate to determine if the error is retryable. Defaults to isTransientError. */
  isRetryable?: (error: unknown) => boolean;
}

/** Determines if an error is transient (network/timeout) vs permanent (business logic). */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  // Network errors (fetch failures, timeouts)
  if (error instanceof TypeError && error.message.includes('fetch')) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;

  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Common transient patterns
  const transientPatterns = [
    'network',
    'timeout',
    'econnreset',
    'econnrefused',
    'socket hang up',
    'failed to fetch',
    'load failed',
    'networkerror',
    '502',
    '503',
    '504',
    'bad gateway',
    'service unavailable',
    'gateway timeout',
    'rate limit',    // 429 — worth retrying after backoff
    'too many requests',
  ];

  return transientPatterns.some((p) => msg.includes(p));
}

/** Calculates delay with exponential backoff + jitter. */
function computeDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelay);
  const jitterAmount = capped * jitter * (Math.random() * 2 - 1); // ±jitter
  return Math.max(0, Math.round(capped + jitterAmount));
}

/**
 * Execute an async function with automatic retry and exponential backoff.
 * Only retries on transient errors by default.
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => supabase.functions.invoke('deduct-class-credit', { body }),
 *   { maxRetries: 3, onRetry: (n, err) => console.warn(`Retry ${n}`, err) }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    maxDelay = 10_000,
    jitter = 0.3,
    onRetry,
    isRetryable = isTransientError,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt or non-transient errors
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }

      const delay = computeDelay(attempt, baseDelay, maxDelay, jitter);
      onRetry?.(attempt + 1, error);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Wraps a Supabase edge function invoke with retry logic.
 * Treats HTTP-level failures as retryable but passes through
 * business-logic errors (returned in the response body).
 */
export async function retryEdgeFunction<T = any>(
  invoke: () => Promise<{ data: T | null; error: any }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: any }> {
  return retryWithBackoff(async () => {
    const result = await invoke();

    // If there's an invocation-level error (network, 5xx), throw to trigger retry
    if (result.error) {
      const msg = typeof result.error === 'string' ? result.error : result.error?.message || '';
      if (isTransientError(new Error(msg))) {
        throw new Error(msg);
      }
    }

    // Business logic errors — return as-is, don't retry
    return result;
  }, options);
}
