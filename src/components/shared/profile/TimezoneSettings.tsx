import React, { useMemo, useState } from 'react';
import { Globe } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Profile } from '@/hooks/useProfile';
import { applyViewerTimezone } from '@/hooks/useTimezoneSync';
import {
  COMMON_TIMEZONES,
  allTimezones,
  formatTimeWithZone,
  getDeviceTimezone,
  getViewerTimezone,
  timezoneLabel,
} from '@/lib/time';

interface TimezoneSettingsProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({
  profile,
  updateProfile,
}) => {
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState(
    profile.timezone || getViewerTimezone()
  );
  const [isSaving, setIsSaving] = useState(false);
  const device = getDeviceTimezone();

  const otherZones = useMemo(() => {
    const common = new Set(COMMON_TIMEZONES.map((z) => z.value));
    return allTimezones().filter((z) => !common.has(z));
  }, []);

  const handleChange = async (next: string) => {
    const previous = timezone;
    setTimezone(next);
    setIsSaving(true);
    try {
      const result = await updateProfile({ timezone: next });
      if (!result) throw new Error('Update failed');
      applyViewerTimezone(next, queryClient);
      toast.success(`Class times now shown in ${timezoneLabel(next)}`);
    } catch {
      setTimezone(previous);
      toast.error('Could not update your time zone');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-6 py-5 space-y-3">
      <div className="flex items-center gap-3">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">Time zone</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Class times, reminders, and calendar events are shown in this time
            zone. It's currently {formatTimeWithZone(new Date(), timezone)}.
          </p>
        </div>
      </div>
      <div className="pl-7 max-w-sm">
        <Select
          value={timezone}
          onValueChange={handleChange}
          disabled={isSaving}
        >
          <SelectTrigger aria-label="Time zone">
            <SelectValue>{timezoneLabel(timezone)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>United States</SelectLabel>
              {COMMON_TIMEZONES.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>All time zones</SelectLabel>
              {otherZones.map((z) => (
                <SelectItem key={z} value={z}>
                  {z.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {device && device !== timezone && (
          <p className="text-xs text-muted-foreground mt-2">
            Your device is set to {timezoneLabel(device)}.{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => handleChange(device)}
              disabled={isSaving}
            >
              Use that instead
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default TimezoneSettings;
