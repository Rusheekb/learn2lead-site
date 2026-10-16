import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MailOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useMyPendingInvites,
  familyKeys,
} from '@/hooks/queries/useFamilyQueries';
import { acceptParentInvite } from '@/services/family/mutations';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { formatHours } from '@/lib/hours';

/**
 * Invites students sent to this parent's email. Accepting links the student
 * and moves their hours, saved card and auto-renew to this account.
 */
const PendingInvitesCard: React.FC = () => {
  const { data: invites = [] } = useMyPendingInvites();
  const queryClient = useQueryClient();
  const { refreshSubscription } = useSubscription();
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);

  if (invites.length === 0) return null;

  const handleAccept = async (token: string) => {
    setAcceptingToken(token);
    try {
      const result = await acceptParentInvite(token);
      toast.success(
        result.hours_moved > 0
          ? `You now manage ${result.student_first_name}'s hours (${formatHours(result.hours_moved)} moved to your balance).`
          : `You now manage ${result.student_first_name}'s hours and payments.`
      );
      await queryClient.invalidateQueries({ queryKey: familyKeys.all });
      await refreshSubscription();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not accept the invitation.'
      );
    } finally {
      setAcceptingToken(null);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MailOpen className="h-4 w-4" aria-hidden="true" />
          Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => {
          const name =
            `${invite.studentFirstName} ${invite.studentLastName}`.trim();
          return (
            <div
              key={invite.token}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm">
                <span className="font-medium">{name}</span> invited you to
                manage their hours and follow their classes. Their hours, saved
                card and auto-renew will move to your account.
              </p>
              <Button
                size="sm"
                onClick={() => handleAccept(invite.token)}
                disabled={acceptingToken !== null}
              >
                {acceptingToken === invite.token ? 'Accepting…' : 'Accept'}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PendingInvitesCard;
