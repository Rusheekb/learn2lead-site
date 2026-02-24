import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, CreditCard } from 'lucide-react';
import { Profile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ profile, updateProfile }) => {
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
        // Revert on failure
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="classReminders" className="cursor-pointer">
              Class reminder emails
            </Label>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="lowCredits" className="cursor-pointer">
              Low-credit alerts
            </Label>
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
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
