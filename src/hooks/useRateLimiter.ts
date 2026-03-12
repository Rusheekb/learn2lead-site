
import { useCallback, useRef, useState } from 'react';

interface RateLimiterOptions {
  /** Max attempts allowed in the window */
  maxAttempts: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Lockout duration in ms after exceeding limit (default: windowMs) */
  lockoutMs?: number;
}

interface RateLimiterState {
  isLimited: boolean;
  remainingAttempts: number;
  lockoutEndsAt: number | null;
  secondsUntilReset: number;
}

/**
 * Client-side rate limiter hook for auth forms.
 * Tracks attempts in-memory per component instance.
 * Not a security boundary — server-side limits are the real protection.
 */
export function useRateLimiter({
  maxAttempts,
  windowMs,
  lockoutMs,
}: RateLimiterOptions) {
  const attemptsRef = useRef<number[]>([]);
  const lockoutEndRef = useRef<number | null>(null);
  const [state, setState] = useState<RateLimiterState>({
    isLimited: false,
    remainingAttempts: maxAttempts,
    lockoutEndsAt: null,
    secondsUntilReset: 0,
  });

  const effectiveLockout = lockoutMs ?? windowMs;

  const pruneExpired = useCallback(() => {
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter(
      (t) => now - t < windowMs
    );
  }, [windowMs]);

  const updateState = useCallback(() => {
    const now = Date.now();

    // Check lockout
    if (lockoutEndRef.current && now < lockoutEndRef.current) {
      setState({
        isLimited: true,
        remainingAttempts: 0,
        lockoutEndsAt: lockoutEndRef.current,
        secondsUntilReset: Math.ceil((lockoutEndRef.current - now) / 1000),
      });
      return;
    }

    // Clear expired lockout
    if (lockoutEndRef.current && now >= lockoutEndRef.current) {
      lockoutEndRef.current = null;
      attemptsRef.current = [];
    }

    pruneExpired();
    const remaining = Math.max(0, maxAttempts - attemptsRef.current.length);

    setState({
      isLimited: remaining === 0,
      remainingAttempts: remaining,
      lockoutEndsAt: null,
      secondsUntilReset: 0,
    });
  }, [maxAttempts, pruneExpired]);

  /** Record an attempt. Returns true if allowed, false if rate-limited. */
  const recordAttempt = useCallback((): boolean => {
    const now = Date.now();

    // In lockout period
    if (lockoutEndRef.current && now < lockoutEndRef.current) {
      updateState();
      return false;
    }

    // Clear expired lockout
    if (lockoutEndRef.current && now >= lockoutEndRef.current) {
      lockoutEndRef.current = null;
      attemptsRef.current = [];
    }

    pruneExpired();

    if (attemptsRef.current.length >= maxAttempts) {
      // Trigger lockout
      lockoutEndRef.current = now + effectiveLockout;
      updateState();
      return false;
    }

    attemptsRef.current.push(now);
    updateState();
    return true;
  }, [maxAttempts, effectiveLockout, pruneExpired, updateState]);

  /** Reset the limiter (e.g., after successful login) */
  const reset = useCallback(() => {
    attemptsRef.current = [];
    lockoutEndRef.current = null;
    setState({
      isLimited: false,
      remainingAttempts: maxAttempts,
      lockoutEndsAt: null,
      secondsUntilReset: 0,
    });
  }, [maxAttempts]);

  return { ...state, recordAttempt, reset };
}
