import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const log = logger.create('PasswordChangeCard');

interface PasswordChangeCardProps {
  email: string;
  emailNote?: string;
}

const PasswordChangeCard: React.FC<PasswordChangeCardProps> = ({
  email,
  emailNote = 'Contact admin to change your email address',
}) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });
      if (error) {
        toast.error('Failed to update password');
        log.error('Password update error:', error);
      } else {
        toast.success('Password updated successfully');
        setPasswords({ new: '', confirm: '' });
      }
    } catch (error) {
      log.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      {/* Email row */}
      <div className="flex items-start justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Email address</p>
            <p className="text-sm text-muted-foreground mt-0.5">{email}</p>
            <p className="text-xs text-muted-foreground mt-1">{emailNote}</p>
          </div>
        </div>
      </div>

      {/* Password row */}
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium">Change password</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 pl-7">
          <div className="space-y-1.5">
            <Label
              htmlFor="newPassword"
              className="text-xs text-muted-foreground"
            >
              New password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={passwords.new}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, new: e.target.value }))
              }
              placeholder="Min. 6 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-xs text-muted-foreground"
            >
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, confirm: e.target.value }))
              }
              placeholder="Re-enter password"
            />
          </div>
        </div>
        <div className="flex justify-end pl-7">
          <Button
            onClick={handlePasswordChange}
            disabled={
              isChangingPassword || !passwords.new || !passwords.confirm
            }
            size="sm"
          >
            {isChangingPassword ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default PasswordChangeCard;
