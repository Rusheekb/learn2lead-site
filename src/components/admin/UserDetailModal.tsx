
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
import { UserCheck, Shield, History } from 'lucide-react';
import { fetchStudentAnalytics, fetchTutorAnalytics } from '@/services/analyticsService';
import { Student, Tutor } from '@/types/tutorTypes';
import { useAuth } from '@/contexts/AuthContext';
import { RolePromotionDialog } from './RolePromotionDialog';

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

interface Props {
  user: User | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function UserDetailModal({ user, onClose, onUserUpdated }: Props) {
  const { userRole } = useAuth();
  const [stats, setStats] = useState<{ totalSessions: number; avgDuration: number } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fn = user.role === 'student' ? fetchStudentAnalytics : fetchTutorAnalytics;
    fn(user.id).then(setStats).catch(console.error);
  }, [user]);

  const isAdmin = userRole === 'admin';
  const canPromote = isAdmin && user?.role === 'student';
  const canDemote = isAdmin && user?.role === 'tutor';

  const handleRoleSuccess = () => {
    onUserUpdated?.();
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
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Analytics
              </h4>
              <p className="text-sm">
                <strong>Total Sessions:</strong> {stats?.totalSessions ?? 'Loading...'}
              </p>
              <p className="text-sm">
                <strong>Avg. Duration:</strong> {stats?.avgDuration ?? 'Loading...'} mins
              </p>
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
