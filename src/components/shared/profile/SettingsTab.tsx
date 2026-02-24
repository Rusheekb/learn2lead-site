import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { SubscriptionStatusCard } from '@/components/student/SubscriptionStatusCard';
import { CreditHistory } from '@/components/student/CreditHistory';
import { AutoRenewalSettings } from '@/components/student/AutoRenewalSettings';
import ReferralCodeSection from './ReferralCodeSection';
import SettingsSection from './SettingsSection';
import NotificationPreferences from './NotificationPreferences';

import AppearanceToggle from './AppearanceToggle';

interface SettingsTabProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ profile, updateProfile }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    new: '',
    confirm: ''
  });

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) {
        toast.error('Failed to update password');
        console.error('Password update error:', error);
      } else {
        toast.success('Password updated successfully');
        setPasswords({ new: '', confirm: '' });
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Subscription & Hours - Students only */}
      {profile.role === 'student' && (
        <SettingsSection
          title="Subscription & Hours"
          description="Manage your subscription plan, auto-renewal, and view credit history."
        >
          <SubscriptionStatusCard />
          <AutoRenewalSettings />
          <CreditHistory />
        </SettingsSection>
      )}

      {/* Account Security */}
      <SettingsSection
        title="Account Security"
        description="Manage your email and password."
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Email</Label>
              <Input value={profile.email} disabled className="bg-muted" />
              <p className="text-sm text-muted-foreground mt-1">
                Contact admin to change email
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Change Password</h4>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !passwords.new || !passwords.confirm}
                className="w-full"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel."
      >
        <AppearanceToggle />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Choose which notifications you receive."
      >
        <NotificationPreferences profile={profile} updateProfile={updateProfile} />
      </SettingsSection>

      {/* Referral Program */}
      <SettingsSection
        title="Referral Program"
        description="Share your referral code and earn rewards."
      >
        <ReferralCodeSection />
      </SettingsSection>

    </div>
  );
};

export default SettingsTab;
