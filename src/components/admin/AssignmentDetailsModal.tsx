import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, Trash2 } from 'lucide-react';
import { TutorStudentAssignment } from '@/services/assignments/assignmentService';
import { endAssignment } from '@/services/assignments/assignmentService';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const log = logger.create('AssignmentDetailsModal');

interface AssignmentDetailsModalProps {
  assignment: TutorStudentAssignment | null;
  tutorName: string;
  studentName: string;
  onClose: () => void;
  onEnded: () => void;
}

interface AssignmentStats {
  classesCompleted: number;
  totalHours: number;
  lastClassDate: string | null;
}

const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  assignment,
  tutorName,
  studentName,
  onClose,
  onEnded,
}) => {
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (!assignment) {
      setStats(null);
      setShowEndConfirm(false);
      return;
    }

    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const { data, error } = await supabase
          .from('class_logs')
          .select('"Time (hrs)", "Date"')
          .eq('tutor_user_id', assignment.tutor_id)
          .eq('student_user_id', assignment.student_id)
          .order('"Date"', { ascending: false });

        if (error) throw error;

        const rows = data || [];
        const totalHours = rows.reduce(
          (sum, row: any) => sum + (parseFloat(row['Time (hrs)']) || 0),
          0
        );

        setStats({
          classesCompleted: rows.length,
          totalHours,
          lastClassDate: (rows[0] as any)?.Date || null,
        });
      } catch (error) {
        log.error('Error loading assignment stats:', error);
        setStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [assignment]);

  const handleConfirmEnd = async () => {
    if (!assignment) return;
    setIsEnding(true);
    try {
      await endAssignment(assignment.id);
      setShowEndConfirm(false);
      onEnded();
    } catch (error) {
      log.error('Failed to end assignment:', error);
    } finally {
      setIsEnding(false);
    }
  };

  if (!assignment) return null;

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-full sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-lg break-words pr-8">
              {tutorName} ↔ {studentName}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
              {assignment.subject && ` · ${assignment.subject}`}
            </p>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={assignment.active ? 'default' : 'secondary'}>
                {assignment.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

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
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Classes Completed
                    </p>
                    <p className="text-lg font-semibold">
                      {stats?.classesCompleted ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-lg font-semibold">
                      {(stats?.totalHours ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Last Class</p>
                    <p className="text-sm font-semibold">
                      {stats?.lastClassDate
                        ? new Date(stats.lastClassDate).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {assignment.active && (
              <div className="space-y-1.5 rounded-lg border border-destructive/30 p-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  End Assignment
                </h4>
                <p className="text-xs text-muted-foreground">
                  The tutor will no longer be matched with this student. Kept on
                  its own step, away from Close, so it can't be clicked by
                  accident.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowEndConfirm(true)}
                  className="w-full sm:w-auto"
                >
                  End Assignment
                </Button>
              </div>
            )}
          </div>

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

      <ConfirmationDialog
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleConfirmEnd}
        title="End this assignment?"
        description="The tutor will no longer be matched with this student. This can be reversed by creating a new assignment."
        confirmText="End Assignment"
        variant="destructive"
        isLoading={isEnding}
      />
    </>
  );
};

export default AssignmentDetailsModal;
