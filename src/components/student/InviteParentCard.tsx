import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  familyKeys,
  useMyFamilyStatus,
} from '@/hooks/queries/useFamilyQueries';
import { cancelParentInvite, inviteParent } from '@/services/family/mutations';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * A student invites a parent. When the parent accepts, they follow the
 * student's classes and take over their hours, saved card and auto-renew.
 */
const InviteParentCard: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: status, isLoading, error } = useMyFamilyStatus();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: familyKeys.all });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setFormError("Enter your parent's email address.");
      return;
    }
    setFormError(null);
    setIsBusy(true);
    try {
      const result = await inviteParent(email.trim());
      toast.success(
        result.email_sent
          ? `Invite sent to ${email.trim()}`
          : 'Invite created. Ask your parent to sign up with that email to accept it.'
      );
      setEmail('');
      await refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not send the invite.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancel = async () => {
    setIsBusy(true);
    try {
      await cancelParentInvite();
      toast.success('Invite cancelled');
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not cancel the invite.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn’t load your family settings. Please refresh and try again.
      </p>
    );
  }

  if (status?.guardian) {
    const name =
      `${status.guardian.firstName} ${status.guardian.lastName}`.trim();
    return (
      <p className="text-sm">
        Your hours and payments are managed by <strong>{name}</strong> (
        {status.guardian.email}). To change this, email{' '}
        <span className="font-medium">learn2leadtutoring@gmail.com</span>.
      </p>
    );
  }

  if (status?.pendingInvite) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Invite sent to <strong>{status.pendingInvite.email}</strong>. It
          expires on{' '}
          {new Date(status.pendingInvite.expiresAt).toLocaleDateString(
            'en-US',
            { month: 'long', day: 'numeric' }
          )}
          .
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isBusy}
        >
          Cancel invite
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleInvite} className="space-y-3" noValidate>
      <p className="text-sm text-muted-foreground">
        Invite a parent to follow your classes and tutor notes. When they
        accept, they take over your hours and payments — your balance, saved
        card and auto-renew move to them.
      </p>
      <div className="space-y-2">
        <Label htmlFor="parent-email">Parent’s email</Label>
        <div className="flex gap-2">
          <Input
            id="parent-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isBusy}>
            <UserPlus className="h-4 w-4 mr-1" aria-hidden="true" />
            {isBusy ? 'Sending…' : 'Invite'}
          </Button>
        </div>
      </div>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
    </form>
  );
};

export default InviteParentCard;
