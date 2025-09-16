import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { promoteStudentToTutorByIdOrEmail, demoteTutorToStudentByIdOrEmail } from '@/services/roleManagement';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    name?: string;
    role: 'student' | 'tutor';
  } | null;
  onSuccess: () => void;
}

export function RolePromotionDialog({ isOpen, onClose, user, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const isPromotion = user.role === 'student';
  const actionText = isPromotion ? 'Promote to Tutor' : 'Demote to Student';
  const warningText = isPromotion 
    ? 'This will give the user tutor privileges including access to student data and class management.'
    : 'This will remove tutor privileges and any student assignments. The user will lose access to tutor features.';

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for this role change');
      return;
    }

    setIsLoading(true);
    try {
      const result = isPromotion 
        ? await promoteStudentToTutorByIdOrEmail(user.id, user.email, reason)
        : await demoteTutorToStudentByIdOrEmail(user.id, user.email, reason);

      if (result.success) {
        toast.success(result.message || `User ${isPromotion ? 'promoted' : 'demoted'} successfully`);
        onSuccess();
        onClose();
        setReason('');
      } else {
        // Handle specific error codes with better messaging
        switch (result.code) {
          case 'NOT_AUTHENTICATED':
            toast.error('Session expired. Please refresh the page and log in again.');
            break;
          case 'PROFILE_NOT_FOUND':
            toast.error('Your user profile could not be found. Please refresh the page and try again.');
            break;
          case 'PERMISSION_DENIED':
            toast.error('You do not have permission to change user roles.');
            break;
          case 'HAS_ACTIVE_STUDENTS':
            toast.error(`Cannot demote tutor with ${result.active_students} active student assignments`);
            break;
          case 'USER_NOT_FOUND':
            toast.error('The selected user could not be found.');
            break;
          case 'INVALID_ROLE':
            toast.error(`User is not a ${isPromotion ? 'student' : 'tutor'}.`);
            break;
          default:
            toast.error(result.error || 'Role change failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Role change error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPromotion ? <UserCheck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            {actionText}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Warning</p>
                <p>{warningText}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>User:</strong> {user.name || user.email}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Current Role:</strong> {user.role}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>New Role:</strong> {isPromotion ? 'tutor' : 'student'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for role change *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for this role change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !reason.trim()}
            variant={isPromotion ? "default" : "destructive"}
          >
            {isLoading ? 'Processing...' : actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}