import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAction } from '@/services/adminActivityLog';
import { fetchStudentGuardian } from '@/services/family/fetch';
import {
  adminUnlinkParent,
  convertToFamily,
  previewConvertToFamily,
} from '@/services/family/mutations';
import type { ConversionPreview } from '@/services/family/types';
import { logger } from '@/lib/logger';

const log = logger.create('AdminFamilySection');

interface AdminFamilySectionProps {
  /** The student's sign-in email (how admin student rows map to profiles). */
  studentEmail: string;
  onChanged?: () => void;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  managed: boolean;
  username: string;
}

/**
 * Family accounts, admin side, for one student: who their parent is (and the
 * live family balance), unlinking, and converting an account whose email is
 * really the parent's into a family account.
 */
const AdminFamilySection: React.FC<AdminFamilySectionProps> = ({
  studentEmail,
  onChanged,
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [guardian, setGuardian] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [familyBalance, setFamilyBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Conversion
  const [preview, setPreview] = useState<ConversionPreview | null>(null);
  const [parentFirst, setParentFirst] = useState('');
  const [parentLast, setParentLast] = useState('');
  const [childFirst, setChildFirst] = useState('');
  const [childLast, setChildLast] = useState('');
  const [confirmConvert, setConfirmConvert] = useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, managed, username')
        .eq('email', studentEmail)
        .maybeSingle();
      if (!data) {
        setProfile(null);
        return;
      }
      setProfile({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name ?? '',
        managed: data.managed,
        username: data.username ?? '',
      });
      setChildFirst(data.first_name);
      setChildLast(data.last_name ?? '');
      const g = await fetchStudentGuardian(data.id);
      setGuardian(g);
      if (g) {
        const { data: balance } = await supabase.rpc(
          'get_student_credit_balance',
          { p_student_id: data.id }
        );
        setFamilyBalance(balance ?? null);
      } else {
        setFamilyBalance(null);
      }
    } catch (err) {
      log.error('Failed to load family details', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    setPreview(null);
    setParentFirst('');
    setParentLast('');
    load();
  }, [load]);

  const handleUnlink = async () => {
    if (!profile) return;
    setIsBusy(true);
    try {
      await adminUnlinkParent(profile.id);
      logAdminAction({
        actionType: 'parent_unlinked',
        description:
          `Unlinked ${guardian?.name ?? 'parent'} from ${profile.firstName} ${profile.lastName}`.trim(),
        entityType: 'student',
        entityId: profile.id,
      });
      toast.success('Parent unlinked. The student now pays for themself.');
      setConfirmUnlink(false);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unlink.');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePreview = async () => {
    if (!profile) return;
    setIsBusy(true);
    try {
      setPreview(await previewConvertToFamily(profile.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not check.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConvert = async () => {
    if (!profile) return;
    setIsBusy(true);
    try {
      await convertToFamily({
        accountId: profile.id,
        parentFirstName: parentFirst.trim(),
        parentLastName: parentLast.trim(),
        childFirstName: childFirst.trim(),
        childLastName: childLast.trim(),
      });
      logAdminAction({
        actionType: 'converted_to_family',
        description:
          `Converted ${studentEmail} into a family account for ${childFirst.trim()} ${childLast.trim()}`.trim(),
        entityType: 'student',
        entityId: profile.id,
      });
      toast.success(
        `Done. ${parentFirst.trim()} now manages ${childFirst.trim()}'s account.`
      );
      setConfirmConvert(false);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Conversion failed.');
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading family…
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Users className="h-4 w-4" />
        Family
      </h4>
      {profile.username && (
        <p className="text-xs text-muted-foreground">
          Username: <span className="font-medium">{profile.username}</span>
        </p>
      )}

      {guardian ? (
        <div className="space-y-2 text-sm">
          <p>
            Parent: <span className="font-medium">{guardian.name}</span> (
            {guardian.email}) — pays for this student’s classes.
          </p>
          {familyBalance !== null && (
            <p className="text-muted-foreground">
              Family balance: {familyBalance} hours. Use Billing → Adjust Hours
              here to change it.
            </p>
          )}
          {profile.managed ? (
            <p className="text-xs text-muted-foreground">
              Added by their parent — no login of their own.
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmUnlink(true)}
              disabled={isBusy}
            >
              Unlink parent
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            No parent linked. If this login actually belongs to the parent (they
            signed up under their own name or email for their child), convert it
            into a family account: the login becomes the parent and keeps its
            balance, card and auto-renew; a new student profile takes over the
            classes, notes and history.
          </p>
          {!preview ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreview}
              disabled={isBusy}
            >
              {isBusy ? 'Checking…' : 'Check what would move'}
            </Button>
          ) : (
            <div className="space-y-3">
              <ul className="text-xs text-muted-foreground list-disc pl-5">
                <li>{preview.scheduled_classes} scheduled classes</li>
                <li>{preview.class_logs} class logs</li>
                <li>{preview.tutor_assignments} tutor assignments</li>
                <li>{preview.tutor_notes} tutor notes</li>
                <li>{preview.shared_files} shared files</li>
                <li>
                  Balance staying with the login: {preview.hours_balance ?? 0}{' '}
                  hours
                </li>
                {preview.past_unlogged_classes > 0 && (
                  <li className="text-destructive">
                    {preview.past_unlogged_classes} past classes not logged yet
                    — they move too and can still be logged.
                  </li>
                )}
              </ul>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="conv-parent-first">Parent first name</Label>
                  <Input
                    id="conv-parent-first"
                    value={parentFirst}
                    onChange={(e) => setParentFirst(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conv-parent-last">Parent last name</Label>
                  <Input
                    id="conv-parent-last"
                    value={parentLast}
                    onChange={(e) => setParentLast(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conv-child-first">Student first name</Label>
                  <Input
                    id="conv-child-first"
                    value={childFirst}
                    onChange={(e) => setChildFirst(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conv-child-last">Student last name</Label>
                  <Input
                    id="conv-child-last"
                    value={childLast}
                    onChange={(e) => setChildLast(e.target.value)}
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setConfirmConvert(true)}
                disabled={isBusy || !parentFirst.trim() || !childFirst.trim()}
              >
                Convert to family account
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        title="Unlink parent?"
        description="The hours stay with the parent who paid. The student starts a fresh balance of their own and buys their own hours from now on."
        confirmText="Unlink"
        onConfirm={handleUnlink}
        isLoading={isBusy}
      />
      <ConfirmationDialog
        isOpen={confirmConvert}
        onClose={() => setConfirmConvert(false)}
        title="Convert to a family account?"
        description={`${studentEmail} becomes ${parentFirst.trim() || 'the parent'}'s login and keeps the balance and card. ${childFirst.trim() || 'The student'} gets a new profile with the classes, notes and history. This is meant to be permanent.`}
        confirmText="Convert"
        onConfirm={handleConvert}
        isLoading={isBusy}
      />
    </div>
  );
};

export default AdminFamilySection;
