import { useEffect } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BUSINESS_TIMEZONE,
  getDeviceTimezone,
  getViewerTimezone,
  setViewerTimezone,
  timezoneLabel,
  zonesDiffer,
} from '@/lib/time';
import { logger } from '@/lib/logger';

const log = logger.create('useTimezoneSync');

const promptKey = (userId: string, saved: string, device: string) =>
  `tz-mismatch-dismissed:${userId}:${saved}:${device}`;

/**
 * Make `tz` the zone every class time is shown in, and refetch so already
 * loaded classes re-render in it. Shared by sign-in sync and Settings.
 */
export function applyViewerTimezone(tz: string, queryClient: QueryClient) {
  const changed = tz !== getViewerTimezone();
  setViewerTimezone(tz);
  if (changed) queryClient.invalidateQueries();
}

export async function saveProfileTimezone(
  userId: string,
  tz: string
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ timezone: tz })
    .eq('id', userId);
  if (error) {
    log.error('Failed to save time zone', error);
    return false;
  }
  return true;
}

/**
 * After sign-in: load the user's saved time zone, fill it in from the device
 * the first time (so nobody has to configure anything), and apply it. If the
 * device later reports a different zone than the saved one (travel, a new
 * computer), offer to switch once rather than changing it silently.
 */
export function useTimezoneSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setViewerTimezone(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) log.warn('Could not load saved time zone', { error });

      const device = getDeviceTimezone();
      let saved: string | null = data?.timezone ?? null;

      if (!saved && device && !error) {
        if (await saveProfileTimezone(userId, device)) saved = device;
        if (cancelled) return;
      }

      applyViewerTimezone(saved ?? device ?? BUSINESS_TIMEZONE, queryClient);

      if (
        saved &&
        device &&
        device !== saved &&
        zonesDiffer(new Date(), saved, device)
      ) {
        const key = promptKey(userId, saved, device);
        let dismissed = false;
        try {
          dismissed = localStorage.getItem(key) === '1';
        } catch {
          // storage unavailable — just show the prompt
        }
        if (!dismissed) {
          const remember = () => {
            try {
              localStorage.setItem(key, '1');
            } catch {
              // ignore
            }
          };
          toast(`Your device is on ${timezoneLabel(device)}`, {
            description: `Class times are showing in ${timezoneLabel(saved)}, your saved time zone. Switch to ${timezoneLabel(device)}?`,
            duration: Infinity,
            action: {
              label: 'Switch',
              onClick: async () => {
                remember();
                if (await saveProfileTimezone(userId, device)) {
                  applyViewerTimezone(device, queryClient);
                  toast.success(`Times now shown in ${timezoneLabel(device)}`);
                } else {
                  toast.error('Could not update your time zone');
                }
              },
            },
            cancel: { label: 'Keep', onClick: remember },
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, queryClient]);
}
