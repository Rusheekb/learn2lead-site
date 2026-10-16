import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export type UsernameStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'reserved'
  | 'error';

export const USERNAME_STATUS_TEXT: Partial<Record<UsernameStatus, string>> = {
  checking: 'Checking…',
  available: 'Available',
  taken: 'That username is taken.',
  invalid: '3–30 characters: letters, numbers, dots or underscores.',
  reserved: 'That username is reserved.',
};

/**
 * Live "is this username free?" check (debounced). `current` is the
 * username the person already has, which counts as available to them.
 */
export function useUsernameAvailability(
  username: string,
  current?: string
): UsernameStatus {
  const value = username.trim().toLowerCase();
  const debounced = useDebounce(value, 400);
  const [status, setStatus] = useState<UsernameStatus>('idle');

  useEffect(() => {
    if (!value) {
      setStatus('idle');
      return;
    }
    if (value === current) {
      setStatus('available');
      return;
    }
    setStatus('checking');
  }, [value, current]);

  useEffect(() => {
    if (!debounced || debounced === current) return;
    let cancelled = false;
    supabase
      .rpc('check_username', { p_username: debounced })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) return setStatus('error');
        const result = data as { available: boolean; reason?: string } | null;
        if (result?.available) setStatus('available');
        else
          setStatus(
            (result?.reason as UsernameStatus | undefined) === 'reserved'
              ? 'reserved'
              : result?.reason === 'invalid'
                ? 'invalid'
                : 'taken'
          );
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, current]);

  return status;
}
