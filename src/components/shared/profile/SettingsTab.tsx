import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Profile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Copy, Video, CalendarDays } from 'lucide-react';
import { SubscriptionStatusCard } from '@/components/student/SubscriptionStatusCard';
import { CreditHistory } from '@/components/student/CreditHistory';
import { AutoRenewalSettings } from '@/components/student/AutoRenewalSettings';
import ReferralCodeSection from './ReferralCodeSection';
import SettingsSection from './SettingsSection';
import NotificationPreferences from './NotificationPreferences';
import AppearanceToggle from './AppearanceToggle';
import PasswordChangeCard from './PasswordChangeCard';
import { getUserCalendarFeedUrl } from '@/utils/calendarUtils';
import { copyToClipboard } from '@/utils/clipboardUtils';
import { fields } from '@/lib/validation';
import { logger } from '@/lib/logger';

const log = logger.create('SettingsTab');

interface SettingsTabProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  updateProfile,
}) => {
  const isTutor = profile.role === 'tutor';

  const [zoomLink, setZoomLink] = useState(profile.zoom_link ?? '');
  const [isSavingZoom, setIsSavingZoom] = useState(false);
  const [calendarFeedUrl, setCalendarFeedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isTutor && profile.id) {
      getUserCalendarFeedUrl(profile.id).then(setCalendarFeedUrl);
    }
  }, [isTutor, profile.id]);

  const handleSaveZoomLink = async () => {
    const urlSchema = fields.url('Zoom link', true);
    const result = urlSchema.safeParse(zoomLink);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Invalid Zoom URL');
      return;
    }
    setIsSavingZoom(true);
    try {
      await updateProfile({ zoom_link: zoomLink || null } as any);
      toast.success('Zoom link saved');
    } catch (error) {
      log.error('Zoom link save error:', error);
      toast.error('Failed to save Zoom link');
    } finally {
      setIsSavingZoom(false);
    }
  };

  const handleCopyFeedUrl = async () => {
    if (!calendarFeedUrl) return;
    const ok = await copyToClipboard(calendarFeedUrl);
    if (ok) toast.success('Calendar feed URL copied');
    else toast.error('Please copy the URL manually');
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Choose which notifications you receive via email."
      >
        <NotificationPreferences
          profile={profile}
          updateProfile={updateProfile}
        />
      </SettingsSection>

      {/* Integrations — tutors only */}
      {isTutor && (
        <SettingsSection
          title="Integrations"
          description="Connect your tools to streamline your sessions."
        >
          {/* Zoom link row */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <Video className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Default Zoom link</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-fills when you schedule new classes
                </p>
              </div>
            </div>
            <div className="flex gap-2 pl-7">
              <Input
                id="zoomLink"
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/your-meeting-id"
                className="flex-1"
              />
              <Button
                onClick={handleSaveZoomLink}
                disabled={isSavingZoom}
                size="sm"
                variant="secondary"
              >
                {isSavingZoom ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Calendar feed row */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Calendar feed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Subscribe in Google, Apple, or Outlook Calendar to auto-sync
                  your classes
                </p>
              </div>
            </div>
            <div className="pl-7">
              {calendarFeedUrl ? (
                <div className="flex gap-2">
                  <Input
                    value={calendarFeedUrl}
                    readOnly
                    className="flex-1 text-xs font-mono bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyFeedUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading your feed URL…
                </p>
              )}
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Subscription & Hours — students only */}
      {profile.role === 'student' && (
        <SettingsSection
          title="Subscription & Hours"
          description="Manage your plan, auto-renewal, and credit history."
        >
          <div className="p-6 space-y-4">
            <SubscriptionStatusCard />
            <AutoRenewalSettings />
            <CreditHistory />
          </div>
        </SettingsSection>
      )}

      {/* Referral Program */}
      <SettingsSection
        title="Referral Program"
        description="Share your referral code and earn rewards."
      >
        <div className="p-6">
          <ReferralCodeSection />
        </div>
      </SettingsSection>

      {/* Account Security */}
      <SettingsSection
        title="Account Security"
        description="Manage your login email and password."
      >
        <PasswordChangeCard email={profile.email} />
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel of your dashboard."
      >
        <AppearanceToggle />
      </SettingsSection>
    </div>
  );
};

export default SettingsTab;
