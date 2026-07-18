import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Bell, CreditCard } from 'lucide-react';
import { Profile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  profile,
  updateProfile,
}) => {
  const [classReminders, setClassReminders] = useState(
    (profile as any).notify_class_reminders ?? true
  );
  const [lowCredits, setLowCredits] = useState(
    (profile as any).notify_low_credits ?? true
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async (field: string, value: boolean) => {
    setIsSaving(true);
    try {
      const result = await updateProfile({ [field]: value } as any);
      if (!result) {
        if (field === 'notify_class_reminders') setClassReminders(!value);
        if (field === 'notify_low_credits') setLowCredits(!value);
      }
    } catch {
      toast.error('Failed to update notification preference');
      if (field === 'notify_class_reminders') setClassReminders(!value);
      if (field === 'notify_low_credits') setLowCredits(!value);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Upcoming class reminders</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Email sent before each scheduled class
            </p>
          </div>
        </div>
        <Switch
          id="classReminders"
          checked={classReminders}
          disabled={isSaving}
          onCheckedChange={(checked) => {
            setClassReminders(checked);
            handleToggle('notify_class_reminders', checked);
          }}
        />
      </div>

      {profile.role === 'student' && (
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Low-credit alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notified when your credit balance runs low
              </p>
            </div>
          </div>
          <Switch
            id="lowCredits"
            checked={lowCredits}
            disabled={isSaving}
            onCheckedChange={(checked) => {
              setLowCredits(checked);
              handleToggle('notify_low_credits', checked);
            }}
          />
        </div>
      )}
    </>
  );
};

export default NotificationPreferences;
