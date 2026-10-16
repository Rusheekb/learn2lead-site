import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.create('notificationPreferences');

export type NotifyCategory =
  | 'class_reminders'
  | 'class_updates'
  | 'billing'
  | 'summaries'
  | 'messages';
export type NotifyChannel = 'email' | 'sms';

export type PreferenceMap = Partial<
  Record<`${NotifyCategory}:${NotifyChannel}`, boolean>
>;

export interface MyPhone {
  value: string;
  verified: boolean;
  optedOut: boolean;
}

export async function fetchMyPreferences(
  userId: string
): Promise<PreferenceMap> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('category, channel, enabled')
    .eq('profile_id', userId);
  if (error) {
    log.error('Error loading preferences', error);
    throw error;
  }
  const map: PreferenceMap = {};
  for (const row of data ?? []) {
    map[`${row.category as NotifyCategory}:${row.channel as NotifyChannel}`] =
      row.enabled;
  }
  return map;
}

export async function setMyPreference(
  userId: string,
  category: NotifyCategory,
  channel: NotifyChannel,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      profile_id: userId,
      category,
      channel,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id,category,channel' }
  );
  if (error) {
    log.error('Error saving preference', error);
    throw error;
  }
}

export async function fetchMyPhone(userId: string): Promise<MyPhone | null> {
  const { data, error } = await supabase
    .from('contact_methods')
    .select('value, verified_at, opted_in_at, opted_out_at')
    .eq('profile_id', userId)
    .eq('kind', 'sms')
    .maybeSingle();
  if (error) {
    log.error('Error loading phone', error);
    throw error;
  }
  if (!data) return null;
  return {
    value: data.value,
    verified: !!data.verified_at && !!data.opted_in_at,
    optedOut: !!data.opted_out_at,
  };
}

/** start { phone, consent } → texts a code; confirm { code }; remove. */
export async function smsVerification(
  action: 'start' | 'confirm' | 'remove',
  body: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string; phone?: string }> {
  const { data, error } = await supabase.functions.invoke('sms-verification', {
    body: { action, ...body },
  });
  if (error) {
    let message = 'Something went wrong. Please try again.';
    try {
      const errBody = await (
        error as { context?: { json?: () => Promise<{ error?: string }> } }
      ).context?.json?.();
      if (errBody?.error) message = errBody.error;
    } catch {
      // keep default
    }
    return { success: false, error: message };
  }
  return data;
}
