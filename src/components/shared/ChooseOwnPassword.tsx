import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { PASSWORD_HINT, passwordProblem } from '@/lib/validation';
import { friendlyAuthError } from '@/utils/authErrors';

/**
 * A student whose parent set (or reset) their password chooses their own
 * before using the portal. Can't be dismissed.
 */
const ChooseOwnPassword: React.FC = () => {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!profile?.must_change_password) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError('The passwords don’t match.');
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setSaving(false);
      return setError(friendlyAuthError(updateError));
    }
    await supabase.rpc('clear_must_change_password');
    await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    setSaving(false);
    toast.success('Your password is set. Welcome!');
  };

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              Welcome{profile.first_name ? `, ${profile.first_name}` : ''}!
              Choose your password
            </DialogTitle>
            <DialogDescription>
              Your parent set a temporary password. Pick one only you know —
              you’ll use it with your username ({profile.username}) to sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="own-password">New password</Label>
            <Input
              id="own-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="own-password-hint"
              autoFocus
            />
            <p id="own-password-hint" className="text-xs text-muted-foreground">
              {PASSWORD_HINT}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="own-password-confirm">Confirm password</Label>
            <Input
              id="own-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving…' : 'Save my password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChooseOwnPassword;
