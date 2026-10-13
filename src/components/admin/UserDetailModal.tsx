import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserCheck,
  Shield,
  History,
  Loader2,
  DollarSign,
  Save,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import {
  fetchStudentAnalytics,
  fetchTutorAnalytics,
} from '@/services/analyticsService';
import { Student, Tutor } from '@/types/tutorTypes';
import { useAuth } from '@/contexts/AuthContext';
import { RolePromotionDialog } from './RolePromotionDialog';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { logAdminAction } from '@/services/adminActivityLog';
import { useQueryClient } from '@tanstack/react-query';
import { deleteStudent } from '@/services/students/studentService';
import { deleteTutor } from '@/services/tutors/tutorService';

const log = logger.create('UserDetailModal');

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

interface Props {
  user: User | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function UserDetailModal({ user, onClose, onUserUpdated }: Props) {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<{
    classesCompleted: number;
    totalCredits: number;
    classesPaid: number;
  } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable rate fields
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [prepaidBalance, setPrepaidBalance] = useState<number>(0);

  // Credit adjustment
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('');
  const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);
  // Payment verification calculator — a sanity check for the admin (e.g.
  // "parent Zelled $300 for 10 classes" -> 10 classes x $30/class = $300
  // confirms the credit amount above is right).
  const [costPerHour, setCostPerHour] = useState<string>('');

  // The modal never unmounts (see AdminDashboard.tsx) — it just gets a new
  // `user` prop or `null` on close. Without this, a half-filled credit
  // adjustment left over from one student (or from closing without
  // submitting) would silently carry into the next student's session.
  useEffect(() => {
    setCreditAmount('');
    setCreditReason('');
    setCostPerHour('');
    setShowDeleteDialog(false);
  }, [user]);

  // Fetch rate data when user changes
  useEffect(() => {
    if (!user) return;

    const fetchRateData = async () => {
      if (user.role === 'student') {
        const { data } = await supabase
          .from('students')
          .select('prepaid_balance')
          .eq('email', user.email)
          .maybeSingle();
        if (data) {
          setPrepaidBalance(Number(data.prepaid_balance) || 0);
        }
      } else if (user.role === 'tutor') {
        const { data } = await supabase
          .from('tutors')
          .select('hourly_rate')
          .eq('email', user.email)
          .maybeSingle();
        if (data) {
          setHourlyRate(data.hourly_rate?.toString() || '');
        }
      }
    };

    fetchRateData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setIsLoadingStats(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (profileError) {
          log.error('Error fetching profile:', profileError);
          setStats(null);
          return;
        }

        if (!profile) {
          setStats({ classesCompleted: 0, totalCredits: 0, classesPaid: 0 });
          return;
        }

        const fn =
          user.role === 'student' ? fetchStudentAnalytics : fetchTutorAnalytics;
        const analytics = await fn(profile.id);
        setStats(analytics);
      } catch (error) {
        log.error('Error fetching user analytics:', error);
        setStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const isAdmin = userRole === 'admin';
  const canPromote = isAdmin && user?.role === 'student';
  const canDemote = isAdmin && user?.role === 'tutor';
  const hasSettingsTab = isAdmin;

  const handleRoleSuccess = () => {
    onUserUpdated?.();
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      if (user.role === 'student') {
        await deleteStudent(user.id);
      } else {
        await deleteTutor(user.id);
      }
      logAdminAction({
        actionType: 'user_deleted',
        description: `Deleted ${user.role} ${user.name || user.email}`,
        entityType: user.role,
        entityId: user.id,
      });
      toast.success(
        `${user.role === 'student' ? 'Student' : 'Tutor'} deleted successfully`
      );
      setShowDeleteDialog(false);
      onUserUpdated?.();
      onClose();
    } catch (error) {
      log.error('Error deleting user:', error);
      toast.error(`Failed to delete ${user.role}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveRates = async () => {
    if (!user || user.role !== 'tutor') return;
    setIsSaving(true);
    try {
      // Matched by email (how class pay is calculated too). This used to
      // match by name, which silently updated nothing whenever the display
      // name differed from the tutors row — while still reporting success.
      const { data: updated, error } = await supabase
        .from('tutors')
        .update({
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        })
        .eq('email', user.email)
        .select('id');
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error('No tutor record found for this email');
      }
      toast.success('Rate updated successfully');
      logAdminAction({
        actionType: 'rates_updated',
        description: `Updated hourly rate for ${user.name || user.email}`,
        entityType: user.role,
        entityId: user.id,
      });
      onUserUpdated?.();
    } catch (error) {
      log.error('Error saving rate:', error);
      toast.error('Failed to update rate');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!user) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Enter a non-zero amount');
      return;
    }
    if (!creditReason.trim()) {
      toast.error('Reason is required');
      return;
    }

    setIsAdjustingCredits(true);
    try {
      // Get profile id from email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      if (!profile) throw new Error('Profile not found');

      // Row-locked, atomic write via edge function (service role) — avoids the
      // stale-balance race of reading credits_remaining and writing it back
      // from the browser, especially against a concurrent class completion.
      const rate = parseFloat(costPerHour);
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: result, error } = await supabase.functions.invoke(
        'admin-adjust-credits',
        {
          body: {
            student_id: profile.id,
            amount,
            reason: creditReason.trim(),
            rate_per_hour:
              amount > 0 && !isNaN(rate) && rate > 0 ? rate : undefined,
          },
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        }
      );
      if (error) throw error;
      if (!result?.success)
        throw new Error(result?.error || 'Failed to adjust hours');

      const newBalance = result.new_balance;

      logAdminAction({
        actionType: 'credits_adjusted',
        description: `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)}h for ${user.name || user.email} — ${creditReason.trim()}`,
        entityType: 'student',
        entityId: profile.id,
        metadata: { amount, newBalance, reason: creditReason.trim() },
      });

      toast.success(
        `${Math.abs(amount)}h ${amount > 0 ? 'added' : 'removed'} successfully`
      );
      queryClient.invalidateQueries({ queryKey: ['admin-activity-log'] });
      setCreditAmount('');
      setCreditReason('');
      setCostPerHour('');
      // Refresh stats
      setStats((s) => (s ? { ...s, totalCredits: newBalance } : s));
    } catch (err) {
      log.error('Credit adjustment failed:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to adjust hours'
      );
    } finally {
      setIsAdjustingCredits(false);
    }
  };

  if (!user) return null;

  const calculatedTotal =
    Math.abs(parseFloat(creditAmount) || 0) * (parseFloat(costPerHour) || 0);

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-full sm:max-w-lg md:max-w-xl w-[calc(100vw-2rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl break-words pr-8 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {user.name || user.email}
              <Badge variant={user.role === 'tutor' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </DialogTitle>
            <p className="text-xs text-muted-foreground truncate">
              {user.email} · {user.id}
            </p>
          </DialogHeader>

          <Tabs defaultValue="profile" className="py-2">
            <TabsList
              className={`grid w-full ${hasSettingsTab ? 'grid-cols-3' : 'grid-cols-2'}`}
            >
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              {hasSettingsTab && (
                <TabsTrigger value="settings">Settings</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="space-y-4 pt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <History className="h-4 w-4" />
                  Analytics
                </h4>
                {isLoadingStats ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <div
                    className={`grid gap-3 ${user.role === 'student' ? 'grid-cols-3' : 'grid-cols-1'}`}
                  >
                    {user.role === 'student' && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Classes Paid
                        </p>
                        <p className="text-lg font-semibold">
                          {stats?.classesPaid ?? 0}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Classes Completed
                      </p>
                      <p className="text-lg font-semibold">
                        {stats?.classesCompleted ?? 0}
                      </p>
                    </div>
                    {user.role === 'student' && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Hours Remaining
                        </p>
                        <p className="text-lg font-semibold">
                          {stats?.totalCredits ?? 0}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 pt-4">
              {user.role === 'tutor' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Rate Management
                  </h4>
                  <div className="space-y-1.5">
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 25.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-fills "Tutor Cost" on future class logs for this
                      tutor.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveRates}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Rate
                  </Button>
                </div>
              )}

              {user.role === 'student' && prepaidBalance > 0 && (
                <div className="space-y-1 rounded-lg border p-3">
                  <Label>Prepaid Balance</Label>
                  <p className="text-sm font-medium text-primary">
                    ${prepaidBalance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Legacy surplus from a past overpayment. Nothing applies this
                    automatically — factor it in manually if relevant.
                  </p>
                </div>
              )}

              {user.role === 'student' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <PlusCircle className="h-4 w-4" />
                    Adjust Hours
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="creditAmount">
                        Hours (+ add / − remove)
                      </Label>
                      <Input
                        id="creditAmount"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 2 or -1"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="creditReason">Reason</Label>
                      <Input
                        id="creditReason"
                        placeholder="e.g. Makeup session"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costPerHour">
                      Rate per hour ($) — optional, one-off
                    </Label>
                    <Input
                      id="costPerHour"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 30.00"
                      value={costPerHour}
                      onChange={(e) => setCostPerHour(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground rounded-md border bg-muted/30 px-2 py-1.5">
                      {Math.abs(parseFloat(creditAmount) || 0)} hours × $
                      {(parseFloat(costPerHour) || 0).toFixed(2)} ={' '}
                      <span className="font-medium text-foreground">
                        ${calculatedTotal.toFixed(2)}
                      </span>{' '}
                      — check this against what was actually paid. Only used
                      when adding hours; prices that many upcoming class hours,
                      then Class Cost reverts to the student's normal Stripe
                      rate.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdjustCredits}
                    disabled={
                      isAdjustingCredits || !creditAmount || !creditReason
                    }
                    className="w-full sm:w-auto"
                  >
                    {isAdjustingCredits ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PlusCircle className="h-4 w-4 mr-2" />
                    )}
                    Apply Adjustment
                  </Button>
                </div>
              )}
            </TabsContent>

            {hasSettingsTab && (
              <TabsContent value="settings" className="space-y-4 pt-4">
                {(canPromote || canDemote) && (
                  <div className="space-y-1.5 rounded-lg border p-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Role Management
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {canPromote
                        ? 'Promote this student to tutor role.'
                        : 'Demote this tutor to student role.'}{' '}
                      Kept on its own tab, away from Close, so it can't be
                      clicked by accident.
                    </p>
                    <Button
                      variant={canPromote ? 'default' : 'destructive'}
                      onClick={() => setShowRoleDialog(true)}
                      className="w-full sm:w-auto"
                    >
                      {canPromote ? 'Promote to Tutor' : 'Demote to Student'}
                    </Button>
                  </div>
                )}

                <div className="space-y-1.5 rounded-lg border border-destructive/30 p-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete {user.role === 'student' ? 'Student' : 'Tutor'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Permanently removes this {user.role} record. This cannot be
                    undone. Kept on its own tab, away from Close, so it can't be
                    clicked by accident.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    Delete {user.role === 'student' ? 'Student' : 'Tutor'}
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RolePromotionDialog
        isOpen={showRoleDialog}
        onClose={() => setShowRoleDialog(false)}
        user={user}
        onSuccess={handleRoleSuccess}
      />

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteUser}
        title={`Delete ${user.name || user.email}?`}
        description={`This permanently deletes this ${user.role} record. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
}
