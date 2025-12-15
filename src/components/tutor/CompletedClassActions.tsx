import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Edit3, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { useQueryClient } from '@tanstack/react-query';
import { useClassCompletionStatus } from '@/hooks/useClassCompletionStatus';
import { ErrorHandler } from '@/services/errorHandling';
import { completeClass, CompleteClassData } from '@/services/classCompletion';
import { parseDateToLocal, formatDateForDatabase } from '@/utils/safeDateUtils';
import { generateClassId } from '@/utils/classIdGenerator';

interface CompletedClassActionsProps {
  classEvent: ClassEvent;
  onUpdate: () => void;
}

const CompletedClassActions: React.FC<CompletedClassActionsProps> = ({
  classEvent,
  onUpdate,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [content, setContent] = useState(classEvent.content || '');
  const [homework, setHomework] = useState(classEvent.homework || '');
  const [confirmChecked, setConfirmChecked] = useState(false);
  
  // Use stable completion status hook to prevent flashing
  const { isCompleted, isLoading: isCheckingStatus, setIsCompleted } = useClassCompletionStatus(classEvent.id);

  const handleMarkComplete = useCallback(async () => {
    if (!user?.id || isCompleting || isCompleted) {
      ErrorHandler.handle(
        { message: 'User not authenticated or operation in progress' },
        'CompletedClassActions.handleMarkComplete'
      );
      return;
    }

    // Validate required fields
    if (!content.trim()) {
      toast.error('Please describe what was covered in this class');
      return;
    }

    // Immediately set completing state and start removal process
    setIsCompleting(true);
    setIsDialogOpen(false); // Close dialog immediately

    try {
      // Get the current user's profile to ensure name matches RLS policy
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to fetch tutor profile for logging');
      }

      // Improve name matching for RLS policies
      const tutorName = currentUserProfile?.first_name && currentUserProfile?.last_name
        ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}`.trim()
        : currentUserProfile?.email || 'Unknown Tutor';
      
      // Calculate duration if missing
      const duration = classEvent.duration || (() => {
        if (classEvent.startTime && classEvent.endTime) {
          const start = new Date(`2000-01-01T${classEvent.startTime}`);
          const end = new Date(`2000-01-01T${classEvent.endTime}`);
          return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 100) / 100;
        }
        return 1; // Default to 1 hour
      })();
      
      // Fetch existing class IDs for the same date to ensure unique ID generation
      const localDate = parseDateToLocal(classEvent.date);
      const dateStr = formatDateForDatabase(localDate);
      
      const { data: existingLogs } = await supabase
        .from('class_logs')
        .select('"Class Number"')
        .eq('Date', dateStr);
      
      const existingIds = (existingLogs || [])
        .map(log => log['Class Number'])
        .filter(Boolean) as string[];
      
      // Generate unique Class ID (e.g., AR-MV-20251111-1)
      const studentName = classEvent.studentName || 'Unknown Student';
      const classNumber = generateClassId({
        studentName,
        tutorName,
        date: localDate,
        existingIds
      });
      
      // Prepare completion data with student ID for credit deduction
      const completionData: CompleteClassData = {
        classId: classEvent.id,
        classNumber,
        title: classEvent.title, // Preserve original title
        tutorName,
        studentName,
        studentId: classEvent.studentId || '', // Required for credit deduction
        date: dateStr,
        day: localDate.toLocaleDateString('en-US', { weekday: 'long' }),
        timeCst: classEvent.startTime,
        timeHrs: duration.toString(),
        subject: classEvent.subject,
        content: content.trim(),
        hw: homework.trim() || '',
        additionalInfo: classEvent.notes || '',
      };

      // Validate student ID is present
      if (!completionData.studentId) {
        toast.error('Cannot complete class: Student ID not found');
        return;
      }

      // Use the new service function
      const success = await completeClass(completionData);

      if (!success) {
        // If completion failed, the error was already shown by the service
        setIsRemoving(true);
        onUpdate();
        return;
      }

      // Start the removal process immediately after success
      setIsRemoving(true);
      // toast.success is already shown by the service
      
      // Force refresh of all relevant data to ensure UI is in sync
      const refreshPromises = [];
      
      if (user?.id) {
        refreshPromises.push(
          queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] }),
          queryClient.refetchQueries({ queryKey: ['scheduledClasses', user.id] }),
          queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] }),
          queryClient.invalidateQueries({ queryKey: ['classLogs'] })
        );
      }
      
      if (classEvent.studentId) {
        refreshPromises.push(
          queryClient.invalidateQueries({ queryKey: ['studentClasses', classEvent.studentId] }),
          queryClient.invalidateQueries({ queryKey: ['upcomingClasses', classEvent.studentId] }),
          queryClient.invalidateQueries({ queryKey: ['studentDashboard', classEvent.studentId] })
        );
      }
      
      await Promise.all(refreshPromises);
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      ErrorHandler.handle(error, 'CompletedClassActions.handleMarkComplete');
      
      // Reset state on error to show button again
      setIsCompleted(false);
      setIsRemoving(false);
    } finally {
      setIsCompleting(false);
    }
  }, [user?.id, isCompleting, isCompleted, classEvent, content, homework, queryClient, onUpdate]);

  // If class is being removed or already completed, don't render anything
  if (isRemoving || isCompleted) {
    return null;
  }

  if (isCheckingStatus) {
    return <Badge variant="secondary">Checking...</Badge>;
  }

  // Show processing state if currently completing
  if (isCompleting) {
    return <Badge variant="secondary">Removing...</Badge>;
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={isCompleting}
        className="flex items-center gap-2"
      >
        <CheckCircle className="h-4 w-4" />
        Mark Complete
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Complete Class & Add Description
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm text-destructive">This action is permanent</p>
                <p className="text-sm text-muted-foreground">
                  Credits will be deducted from the student's account and cannot be automatically restored. 
                  Please verify all class information is correct before completing.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Class Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Title:</span> {classEvent.title}
                </div>
                <div>
                  <span className="font-medium">Subject:</span> {classEvent.subject}
                </div>
                <div>
                  <span className="font-medium">Student:</span> {classEvent.studentName}
                </div>
                <div>
<span className="font-medium">Date:</span> {parseDateToLocal(classEvent.date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="content">What was covered in this class? *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the topics covered, activities completed, student progress, key concepts learned..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="homework">Homework/Follow-up tasks assigned</Label>
              <Textarea
                id="homework"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="List any homework assignments, practice problems, reading materials, or follow-up tasks..."
                rows={3}
              />
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <Checkbox
                id="confirm"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked === true)}
              />
              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I confirm that all class information is accurate and understand that this action cannot be undone
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setConfirmChecked(false);
                }}
                disabled={isCompleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkComplete}
                disabled={isCompleting || !content.trim() || !confirmChecked}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isCompleting ? 'Saving...' : 'Complete & Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompletedClassActions;