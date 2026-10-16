import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import {
  familyKeys,
  useStudentLoginStatus,
} from '@/hooks/queries/useFamilyQueries';
import {
  USERNAME_STATUS_TEXT,
  useUsernameAvailability,
} from '@/hooks/useUsernameAvailability';
import { manageStudentLogin } from '@/services/family/mutations';
import { generateTempPassword } from '@/lib/tempPassword';
import {
  PASSWORD_HINT,
  USERNAME_HINT,
  passwordProblem,
} from '@/lib/validation';
import { copyToClipboard } from '@/utils/clipboardUtils';
import type { FamilyChild } from '@/services/family/types';

interface StudentLoginCardProps {
  child: FamilyChild;
}

type DialogMode = 'setup' | 'reset' | null;

/**
 * A parent gives a student their own sign-in (username + a temporary
 * password the student replaces), resets it, or turns it off. The student's
 * portal never shows billing.
 */
const StudentLoginCard: React.FC<StudentLoginCardProps> = ({ child }) => {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useStudentLoginStatus(child.studentId);
  const [mode, setMode] = useState<DialogMode>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const usernameStatus = useUsernameAvailability(
    mode === 'setup' ? username : '',
    status?.username
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: familyKeys.all });

  const open = (next: DialogMode) => {
    setUsername(status?.username ?? child.username);
    setPassword(generateTempPassword());
    setError(null);
    setSaved(null);
    setMode(next);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (
      mode === 'setup' &&
      ['taken', 'invalid', 'reserved'].includes(usernameStatus)
    ) {
      return setError(USERNAME_STATUS_TEXT[usernameStatus] ?? USERNAME_HINT);
    }
    setError(null);
    setSaving(true);
    try {
      await manageStudentLogin(
        mode === 'setup' ? 'setup' : 'reset_password',
        child.studentId,
        mode === 'setup' ? { username, password } : { password }
      );
      setSaved({
        username: (mode === 'setup' ? username : (status?.username ?? ''))
          .trim()
          .toLowerCase(),
        password,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (action: 'disable' | 'enable') => {
    setSaving(true);
    try {
      await manageStudentLogin(action, child.studentId);
      toast.success(
        action === 'disable'
          ? `${child.firstName}’s sign-in is turned off`
          : `${child.firstName} can sign in again`
      );
      setConfirmOff(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update.');
    } finally {
      setSaving(false);
    }
  };

  const copyDetails = async () => {
    if (!saved) return;
    const text = `Learn2Lead sign-in for ${child.firstName}\nWebsite: learn2lead.page/login\nUsername: ${saved.username}\nTemporary password: ${saved.password}\n(${child.firstName} will choose a new password the first time.)`;
    if (await copyToClipboard(text)) toast.success('Copied');
  };

  let body: React.ReactNode;
  if (isLoading || !status) {
    body = <Skeleton className="h-16" />;
  } else if (!status.managed) {
    body = (
      <p className="text-sm text-muted-foreground">
        {child.firstName} signs in with their own account (username{' '}
        <span className="font-medium text-foreground">{status.username}</span>)
        and manages their own password.
      </p>
    );
  } else if (!status.hasPassword) {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {child.firstName} doesn’t have a sign-in yet. Give them one so they
          can see their schedule, Zoom links, tutor notes and homework — never
          prices or payments.
        </p>
        <Button size="sm" onClick={() => open('setup')}>
          <KeyRound className="h-4 w-4 mr-1" aria-hidden="true" />
          Set up {child.firstName}’s sign-in
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-3">
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="font-medium">{status.username}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            {status.disabled
              ? 'Turned off'
              : status.mustChangePassword
                ? 'Ready — they’ll choose their own password at first sign-in'
                : 'Active'}
          </dd>
          <dt className="text-muted-foreground">Last signed in</dt>
          <dd>
            {status.lastSignInAt
              ? format(parseISO(status.lastSignInAt), 'MMM d, yyyy')
              : 'Not yet'}
          </dd>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => open('reset')}>
            Reset password
          </Button>
          {status.disabled ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggle('enable')}
              disabled={saving}
            >
              Turn sign-in back on
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmOff(true)}
            >
              Turn off sign-in
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sign-in</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          {saved ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{child.firstName} can sign in now</DialogTitle>
                <DialogDescription>
                  Share these with {child.firstName}. They’ll choose their own
                  password the first time.
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
                <dt className="text-muted-foreground">Website</dt>
                <dd>learn2lead.page/login</dd>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-medium">{saved.username}</dd>
                <dt className="text-muted-foreground">Password</dt>
                <dd className="font-mono">{saved.password}</dd>
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={copyDetails}>
                  <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
                  Copy
                </Button>
                <Button onClick={() => setMode(null)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={save} noValidate className="space-y-4">
              <DialogHeader>
                <DialogTitle>
                  {mode === 'setup'
                    ? `Set up ${child.firstName}’s sign-in`
                    : `Reset ${child.firstName}’s password`}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'setup'
                    ? `${child.firstName} will sign in with a username — no email needed.`
                    : `${child.firstName} will use this once, then choose a new password.`}
                </DialogDescription>
              </DialogHeader>
              {mode === 'setup' && (
                <div className="space-y-2">
                  <Label htmlFor="student-username">Username</Label>
                  <Input
                    id="student-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby="student-username-hint"
                  />
                  <p
                    id="student-username-hint"
                    className="text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    {USERNAME_STATUS_TEXT[usernameStatus] ?? USERNAME_HINT}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="student-temp-password">
                  Temporary password
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="student-temp-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono"
                    autoComplete="off"
                    aria-describedby="student-temp-password-hint"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPassword(generateTempPassword())}
                    aria-label="Make a new password"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <p
                  id="student-temp-password-hint"
                  className="text-xs text-muted-foreground"
                >
                  {PASSWORD_HINT}
                </p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? 'Saving…'
                    : mode === 'setup'
                      ? 'Create sign-in'
                      : 'Reset password'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={() => toggle('disable')}
        title={`Turn off ${child.firstName}’s sign-in?`}
        description={`${child.firstName} will be signed out everywhere and can’t sign in until you turn it back on. Classes, reminders and your access don’t change.`}
        confirmText="Turn off"
        isLoading={saving}
      />
    </Card>
  );
};

export default StudentLoginCard;
