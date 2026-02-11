
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCheck, Shield, History, Loader2, DollarSign, Save } from 'lucide-react';
import { fetchStudentAnalytics, fetchTutorAnalytics } from '@/services/analyticsService';
import { Student, Tutor } from '@/types/tutorTypes';
import { useAuth } from '@/contexts/AuthContext';
import { RolePromotionDialog } from './RolePromotionDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

interface Props {
  user: User | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function UserDetailModal({ user, onClose, onUserUpdated }: Props) {
  const { userRole } = useAuth();
  const [stats, setStats] = useState<{ classesCompleted: number; totalCredits: number } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable rate fields
  const [classRate, setClassRate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('zelle');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [prepaidBalance, setPrepaidBalance] = useState<number>(0);
  // Fetch rate data when user changes
  useEffect(() => {
    if (!user) return;

    const fetchRateData = async () => {
      if (user.role === 'student') {
        const { data } = await supabase
          .from('students')
          .select('class_rate, payment_method, prepaid_balance')
          .eq('name', user.name)
          .maybeSingle();
        if (data) {
          setClassRate(data.class_rate?.toString() || '');
          setPaymentMethod(data.payment_method || 'zelle');
          setPrepaidBalance(Number(data.prepaid_balance) || 0);
        }
      } else if (user.role === 'tutor') {
        const { data } = await supabase
          .from('tutors')
          .select('hourly_rate')
          .eq('name', user.name)
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
          console.error('Error fetching profile:', profileError);
          setStats(null);
          return;
        }

        if (!profile) {
          setStats({ classesCompleted: 0, totalCredits: 0 });
          return;
        }

        const fn = user.role === 'student' ? fetchStudentAnalytics : fetchTutorAnalytics;
        const analytics = await fn(profile.id);
        setStats(analytics);
      } catch (error) {
        console.error('Error fetching user analytics:', error);
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

  const handleRoleSuccess = () => {
    onUserUpdated?.();
  };

  const handleSaveRates = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (user.role === 'student') {
        const { error } = await supabase
          .from('students')
          .update({
            class_rate: classRate ? parseFloat(classRate) : null,
            payment_method: paymentMethod,
          })
          .eq('name', user.name);
        if (error) throw error;
      } else if (user.role === 'tutor') {
        const { error } = await supabase
          .from('tutors')
          .update({
            hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          })
          .eq('name', user.name);
        if (error) throw error;
      }
      toast.success('Rates updated successfully');
      onUserUpdated?.();
    } catch (error) {
      console.error('Error saving rates:', error);
      toast.error('Failed to update rates');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-full sm:max-w-md md:max-w-lg w-[calc(100vw-2rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl break-words pr-8 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {user.email}
              <Badge variant={user.role === 'tutor' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm"><strong>Name:</strong> {user.name || '—'}</p>
              <p className="text-sm"><strong>User ID:</strong> {user.id}</p>
              <p className="text-sm"><strong>Email:</strong> {user.email}</p>
            </div>
            
            <hr className="my-4" />

            {/* Rate Management Section */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Rate Management
              </h4>

              {user.role === 'student' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="classRate">Class Rate ($)</Label>
                    <Input
                      id="classRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 50.00"
                      value={classRate}
                      onChange={(e) => setClassRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-fills "Class Cost" on future class logs for this student.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zelle">Zelle</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {prepaidBalance > 0 && (
                    <div className="space-y-1.5">
                      <Label>Prepaid Balance</Label>
                      <p className="text-sm font-medium text-primary">
                        ${prepaidBalance.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Surplus from overpayment, auto-applied to future classes.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {user.role === 'tutor' && (
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
                    Auto-fills "Tutor Cost" on future class logs for this tutor.
                  </p>
                </div>
              )}

              <Button
                size="sm"
                onClick={handleSaveRates}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Rates
              </Button>
            </div>
            
            <hr className="my-4" />
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Analytics
              </h4>
              {isLoadingStats ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading analytics...
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    <strong>Classes Completed:</strong> {stats?.classesCompleted ?? 0}
                  </p>
                  {user.role === 'student' && (
                    <p className="text-sm">
                      <strong>Total Credits:</strong> {stats?.totalCredits ?? 0}
                    </p>
                  )}
                </>
              )}
            </div>

            {isAdmin && (canPromote || canDemote) && (
              <>
                <hr className="my-4" />
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Role Management
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {canPromote ? 'Promote this student to tutor role' : 'Demote this tutor to student role'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isAdmin && (canPromote || canDemote) && (
              <Button 
                variant={canPromote ? "default" : "destructive"}
                onClick={() => setShowRoleDialog(true)}
                className="w-full sm:w-auto"
              >
                {canPromote ? 'Promote to Tutor' : 'Demote to Student'}
              </Button>
            )}
            <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">
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
    </>
  );
}
