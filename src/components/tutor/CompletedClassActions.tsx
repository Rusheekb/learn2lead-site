import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { useQueryClient } from '@tanstack/react-query';
import { useClassCompletionStatus } from '@/hooks/useClassCompletionStatus';

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
  
  // Use stable completion status hook to prevent flashing
  const { isCompleted, isLoading: isCheckingStatus, setIsCompleted } = useClassCompletionStatus(classEvent.id);

  const handleMarkComplete = useCallback(async () => {
    if (!user?.id || isCompleting || isCompleted) {
      toast.error('User not authenticated or operation in progress');
      return;
    }

    // Immediately set completing state and start removal process
    setIsCompleting(true);
    setIsDialogOpen(false); // Close dialog immediately

    try {
      // Get the current user's profile to ensure name matches RLS policy
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching tutor profile:', profileError);
        throw new Error('Failed to fetch tutor profile for logging');
      }

      const tutorName = `${currentUserProfile?.first_name || ''} ${currentUserProfile?.last_name || ''}`.trim() || 'Unknown Tutor';
      
      // Use the atomic function to prevent duplicates
      const { data: result, error: functionError } = await supabase
        .rpc('complete_class_atomic', {
          p_class_id: classEvent.id,
          p_class_number: classEvent.title,
          p_tutor_name: tutorName,
          p_student_name: classEvent.studentName || 'Unknown Student',
          p_date: new Date(classEvent.date).toISOString().split('T')[0],
          p_day: new Date(classEvent.date).toLocaleDateString('en-US', { weekday: 'long' }),
          p_time_cst: classEvent.startTime,
          p_time_hrs: classEvent.duration?.toString() || '0',
          p_subject: classEvent.subject,
          p_content: content,
          p_hw: homework || '',
          p_additional_info: classEvent.notes || '',
        });

      if (functionError) {
        console.error('Error calling complete_class_atomic:', functionError);
        throw functionError;
      }

      // Type the result properly
      const typedResult = result as { success: boolean; error?: string; code?: string; message?: string };

      if (!typedResult?.success) {
        if (typedResult?.code === 'ALREADY_COMPLETED' || typedResult?.code === 'DUPLICATE_SESSION') {
          toast.error('This class has already been completed');
          setIsRemoving(true); // Hide the component
          return;
        } else if (typedResult?.code === 'CLASS_NOT_FOUND') {
          toast.error('Class no longer exists or has already been completed');
          setIsRemoving(true); // Hide the component
          onUpdate(); // Refresh the calendar to remove this class
          return;
        }
        throw new Error(typedResult?.error || 'Failed to complete class');
      }

      // Start the removal process immediately after success
      setIsRemoving(true);
      toast.success('Class completed and moved to class history');
      
      // Force refresh of all relevant data to ensure UI is in sync
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        await queryClient.refetchQueries({ queryKey: ['scheduledClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['classLogs'] });
      }
      
      if (classEvent.studentId) {
        queryClient.invalidateQueries({ queryKey: ['studentClasses', classEvent.studentId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', classEvent.studentId] });
        queryClient.invalidateQueries({ queryKey: ['studentDashboard', classEvent.studentId] });
      }
      
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error completing class:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(`Failed to mark class as completed: ${errorMessage}`);
      
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
                  <span className="font-medium">Date:</span> {new Date(classEvent.date).toLocaleDateString()}
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isCompleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkComplete}
                disabled={isCompleting || !content.trim()}
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