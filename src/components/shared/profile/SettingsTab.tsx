import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsTabProps {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ profile, updateProfile }) => {
  const { t } = useTranslation();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [emailSettings, setEmailSettings] = useState({
    newEmail: profile.email || ''
  });
  const [paymentPlan, setPaymentPlan] = useState('basic');

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
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (emailSettings.newEmail === profile.email) {
      toast.error('New email is the same as current email');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: emailSettings.newEmail
      });

      if (error) {
        toast.error('Failed to update email');
        console.error('Email update error:', error);
      } else {
        toast.success('Email update initiated. Please check your new email for confirmation.');
      }
    } catch (error) {
      console.error('Email update error:', error);
      toast.error('Failed to update email');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.profileSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">{t('profile.firstName')}</Label>
              <Input
                id="firstName"
                value={profile.first_name || ''}
                onChange={(e) => updateProfile({ first_name: e.target.value })}
                placeholder={t('profile.enterFirstName') as string}
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t('profile.lastName')}</Label>
              <Input
                id="lastName"
                value={profile.last_name || ''}
                onChange={(e) => updateProfile({ last_name: e.target.value })}
                placeholder={t('profile.enterLastName') as string}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.accountSecurity')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentEmail">{t('profile.currentEmail')}</Label>
            <div className="flex gap-2">
              <Input
                id="currentEmail"
                value={emailSettings.newEmail}
                onChange={(e) => setEmailSettings({ newEmail: e.target.value })}
                placeholder={t('profile.enterNewEmail') as string}
              />
              <Button 
                onClick={handleEmailChange}
                variant="outline"
                disabled={emailSettings.newEmail === profile.email}
              >
                {t('profile.updateEmail')}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">{t('profile.changePassword')}</h4>
            <div>
              <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                placeholder={t('profile.enterNewPassword') as string}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder={t('profile.confirmNewPassword') as string}
              />
            </div>
            <Button 
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !passwords.new || !passwords.confirm}
              className="w-full"
            >
              {isChangingPassword ? t('profile.updating') : t('profile.updatePassword')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Plan */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.paymentPlan')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="plan">{t('profile.currentPlan')}</Label>
            <Select value={paymentPlan} onValueChange={setPaymentPlan}>
              <SelectTrigger>
                <SelectValue placeholder={t('profile.selectPlan')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">{t('profile.basicPlan')}</SelectItem>
                <SelectItem value="premium">{t('profile.premiumPlan')}</SelectItem>
                <SelectItem value="enterprise">{t('profile.enterprisePlan')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="w-full">
            {t('profile.manageBilling')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;