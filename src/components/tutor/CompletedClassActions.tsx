import React, { useState } from 'react';
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
  const [content, setContent] = useState(classEvent.content || '');
  const [homework, setHomework] = useState(classEvent.homework || '');

  const handleMarkComplete = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsCompleting(true);
    try {
      console.log('Starting class completion for:', classEvent.id);
      
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

      // Match the exact format used in RLS policy: concat(first_name, ' ', last_name)
      const tutorName = `${currentUserProfile?.first_name || ''} ${currentUserProfile?.last_name || ''}`;
      
      // Create class log entry directly (moving from scheduled_classes to class_logs)
      const { error: logError } = await supabase
        .from('class_logs')
        .insert({
          'Class Number': classEvent.title,
          'Tutor Name': tutorName,
          'Student Name': classEvent.studentName,
          'Date': new Date(classEvent.date).toISOString().split('T')[0],
          'Day': new Date(classEvent.date).toLocaleDateString('en-US', { weekday: 'long' }),
          'Time (CST)': classEvent.startTime,
          'Time (hrs)': classEvent.duration?.toString() || '0',
          'Subject': classEvent.subject,
          'Content': content,
          'HW': homework,
          'Class ID': classEvent.id,
          'Additional Info': classEvent.notes || null,
          'Student Payment': 'Pending',
          'Tutor Payment': 'Pending',
        });

      if (logError) {
        console.error('Error creating class log:', logError);
        throw logError;
      }

      // Now remove from scheduled_classes since it's been moved to class_logs
      const { error: deleteError } = await supabase
        .from('scheduled_classes')
        .delete()
        .eq('id', classEvent.id);

      if (deleteError) {
        console.error('Error removing scheduled class:', deleteError);
        throw deleteError;
      }

      console.log('Class completion successful - moved from scheduled to logs');
      toast.success('Class completed and moved to class history');
      
      // Invalidate all relevant queries to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingClasses'] });
      queryClient.invalidateQueries({ queryKey: ['classLogs'] });
      
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] });
      }
      
      if (classEvent.studentId) {
        queryClient.invalidateQueries({ queryKey: ['studentClasses', classEvent.studentId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', classEvent.studentId] });
        queryClient.invalidateQueries({ queryKey: ['studentDashboard', classEvent.studentId] });
      }
      
      // Force an immediate refetch by calling onUpdate
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error completing class:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(`Failed to mark class as completed: ${errorMessage}`);
    } finally {
      setIsCompleting(false);
    }
  };

  // Since completed classes are moved to class_logs, 
  // this component only handles scheduled classes
  const isCompleted = false;

  return (
    <>
      <Button
        variant={isCompleted ? "outline" : "default"}
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        {isCompleted ? (
          <>
            <Edit3 className="h-4 w-4" />
            Edit Log
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            Mark Complete
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isCompleted ? 'Edit Class Log' : 'Complete Class & Add Description'}
              {isCompleted && <Badge variant="secondary">Completed</Badge>}
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