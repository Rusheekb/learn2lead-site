import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit3, Save, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';

interface CompletedClassActionsProps {
  classEvent: ClassEvent;
  onUpdate: () => void;
}

const CompletedClassActions: React.FC<CompletedClassActionsProps> = ({
  classEvent,
  onUpdate,
}) => {
  const { user } = useAuth();
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
      
      // Update scheduled class status to completed - this will trigger auto_create_class_log()
      const { error: scheduleError } = await supabase
        .from('scheduled_classes')
        .update({ 
          status: 'completed',
          notes: content 
        })
        .eq('id', classEvent.id);

      if (scheduleError) {
        console.error('Error updating scheduled class:', scheduleError);
        throw scheduleError;
      }

      console.log('Scheduled class updated, waiting for trigger to create log...');

      // Wait a moment for the trigger to create the class log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Now update the class log with our content and homework
      const { error: logError } = await supabase
        .from('class_logs')
        .update({
          Content: content,
          HW: homework,
        })
        .eq('Class ID', classEvent.id);

      if (logError) {
        console.error('Error updating class log:', logError);
        throw logError;
      }

      console.log('Class completion successful');
      toast.success('Class marked as completed and logged');
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

  const handleUnmarkComplete = async () => {
    setIsCompleting(true);
    try {
      // Update scheduled class status back to scheduled
      const { error: scheduleError } = await supabase
        .from('scheduled_classes')
        .update({ 
          status: 'scheduled',
          notes: null 
        })
        .eq('id', classEvent.id);

      if (scheduleError) throw scheduleError;

      toast.success('Class status reverted to scheduled');
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error reverting class status:', error);
      toast.error('Failed to revert class status');
    } finally {
      setIsCompleting(false);
    }
  };

  const isCompleted = classEvent.status === 'completed';

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

            <div className="flex justify-between gap-2 pt-4">
              <div>
                {isCompleted && (
                  <Button
                    variant="outline"
                    onClick={handleUnmarkComplete}
                    disabled={isCompleting}
                    className="flex items-center gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Undo2 className="h-4 w-4" />
                    Revert to Scheduled
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
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
                  {isCompleting ? 'Saving...' : (isCompleted ? 'Update Log' : 'Complete & Save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompletedClassActions;