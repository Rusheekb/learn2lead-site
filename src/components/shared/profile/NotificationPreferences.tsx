import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  CreditCard,
  MessageSquare,
  NotebookPen,
  FileText,
} from 'lucide-react';
import { Profile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  fetchMyPhone,
  fetchMyPreferences,
  NotifyCategory,
  NotifyChannel,
  setMyPreference,
} from '@/services/notifications/preferences';
import { isSmsEnabled } from '@/config/features';

interface NotificationPreferencesProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

interface Row {
  category: NotifyCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const icon = (C: typeof Bell) => (
  <C className="h-4 w-4 text-muted-foreground shrink-0" />
);

const ROWS: Record<NotifyCategory, Row> = {
  class_reminders: {
    category: 'class_reminders',
    label: 'Upcoming class reminders',
    description: 'The day before each class, with the Zoom link',
    icon: icon(Bell),
  },
  class_updates: {
    category: 'class_updates',
    label: 'Class notes & updates',
    description: 'Tutor notes, homework, and new tutor matches',
    icon: icon(NotebookPen),
  },
  messages: {
    category: 'messages',
    label: 'Messages',
    description: 'When someone sends you a message',
    icon: icon(MessageSquare),
  },
  billing: {
    category: 'billing',
    label: 'Low-balance alerts',
    description: 'When your hours run low or run out',
    icon: icon(CreditCard),
  },
  summaries: {
    category: 'summaries',
    label: 'Weekly & quarterly summaries',
    description: 'A recap of classes and progress',
    icon: icon(FileText),
  },
};

/** Old per-profile switches the email defaults still follow. */
const LEGACY_EMAIL_FIELD: Partial<Record<NotifyCategory, keyof Profile>> = {
  class_reminders: 'notify_class_reminders' as keyof Profile,
  billing: 'notify_low_credits' as keyof Profile,
};

/**
 * Per kind of notification, per channel. Email defaults match the old
 * settings; texts need a verified mobile number (Text messages, below) and
 * only show once texting is switched on (isSmsEnabled).
 */
const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  profile,
  updateProfile,
}) => {
  const { managedBy } = useSubscription();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: prefs = {} } = useQuery({
    queryKey: ['notification-preferences', profile.id],
    queryFn: () => fetchMyPreferences(profile.id),
  });
  const smsOn = isSmsEnabled();
  const { data: phone } = useQuery({
    queryKey: ['my-phone', profile.id],
    queryFn: () => fetchMyPhone(profile.id),
    enabled: smsOn,
  });
  const canText = !!phone?.verified && !phone.optedOut;

  // Billing and summaries go to whoever pays: a parent, or a student without one.
  const pays =
    profile.role === 'parent' || (profile.role === 'student' && !managedBy);
  const rows: Row[] =
    profile.role === 'tutor'
      ? [ROWS.class_reminders, ROWS.messages]
      : [
          ROWS.class_reminders,
          ROWS.class_updates,
          ROWS.messages,
          ...(pays ? [ROWS.billing, ROWS.summaries] : []),
        ];

  const value = (category: NotifyCategory, channel: NotifyChannel): boolean => {
    const saved = prefs[`${category}:${channel}`];
    if (saved !== undefined) return saved;
    if (channel === 'sms') return false;
    const legacy = LEGACY_EMAIL_FIELD[category];
    return legacy ? ((profile as any)[legacy] ?? true) : true;
  };

  const toggle = async (
    category: NotifyCategory,
    channel: NotifyChannel,
    enabled: boolean
  ) => {
    const key = `${category}:${channel}`;
    setSaving(key);
    try {
      await setMyPreference(profile.id, category, channel, enabled);
      const legacy = LEGACY_EMAIL_FIELD[category];
      if (channel === 'email' && legacy) {
        await updateProfile({ [legacy]: enabled } as Partial<Profile>);
      }
      await queryClient.invalidateQueries({
        queryKey: ['notification-preferences', profile.id],
      });
    } catch {
      toast.error('Failed to update notification preference');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="px-6 py-4">
      <div
        className={`grid ${smsOn ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'} items-center gap-x-4 gap-y-4`}
      >
        <span>
          <span className="sr-only">Notification</span>
        </span>
        <span className="text-xs font-medium text-muted-foreground text-center w-12">
          Email
        </span>
        {smsOn && (
          <span className="text-xs font-medium text-muted-foreground text-center w-12">
            Text
          </span>
        )}
        {rows.map((row) => (
          <React.Fragment key={row.category}>
            <div className="flex items-center gap-3 min-w-0">
              {row.icon}
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.description}
                </p>
              </div>
            </div>
            <div className="flex justify-center w-12">
              <Switch
                checked={value(row.category, 'email')}
                disabled={saving !== null}
                onCheckedChange={(c) => toggle(row.category, 'email', c)}
                aria-label={`${row.label} by email`}
              />
            </div>
            {smsOn && (
              <div className="flex justify-center w-12">
                <Switch
                  checked={canText && value(row.category, 'sms')}
                  disabled={saving !== null || !canText}
                  onCheckedChange={(c) => toggle(row.category, 'sms', c)}
                  aria-label={`${row.label} by text message`}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {smsOn && !canText && (
        <p className="text-xs text-muted-foreground mt-4">
          {phone?.optedOut
            ? 'Texts are paused because you replied STOP. Reply START to resume.'
            : 'Add a mobile number under Text messages to get texts.'}
        </p>
      )}
    </div>
  );
};

export default NotificationPreferences;
