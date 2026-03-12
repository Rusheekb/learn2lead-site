/**
 * Simple in-memory rate limiter for edge functions.
 * Per-instance; resets on cold start. Good enough for basic abuse prevention.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Key prefix to namespace different functions */
  keyPrefix?: string;
}

/**
 * Extract a rate limit key from the request (IP or auth user ID).
 */
export function getRateLimitKey(req: Request, prefix: string = ''): string {
  // Try to get user ID from auth header (more reliable than IP for authenticated endpoints)
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sub) {
        return `${prefix}:user:${payload.sub}`;
      }
    } catch {
      // Fall through to IP-based limiting
    }
  }

  // Fall back to IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'unknown';

  return `${prefix}:ip:${ip}`;
}

/**
 * Check if a request is rate limited.
 * Returns { limited: false } if allowed, or { limited: true, retryAfterMs } if blocked.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): { limited: boolean; retryAfterMs?: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return { limited: false, remaining: options.maxRequests - 1 };
  }

  if (entry.count >= options.maxRequests) {
    return {
      limited: true,
      retryAfterMs: entry.resetAt - now,
      remaining: 0,
    };
  }

  entry.count++;
  return { limited: false, remaining: options.maxRequests - entry.count };
}

/**
 * Create a rate-limited Response (429 Too Many Requests).
 */
export function rateLimitResponse(
  retryAfterMs: number,
  corsHeaders: Record<string, string>
): Response {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retry_after_seconds: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
