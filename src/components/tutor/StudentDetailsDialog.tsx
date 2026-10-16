import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User } from 'lucide-react';
import { Student } from '@/types/sharedTypes';
import { useStudentNotes } from '@/hooks/useStudentNotes';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenConversation } from '@/components/shared/messages/useOpenConversation';
import StudentOverview from './StudentOverview';
import StudentNotes from './StudentNotes';

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  open,
  onOpenChange,
  student,
  activeTab,
  setActiveTab,
}) => {
  const { notes, loading, creating, addNote } = useStudentNotes(
    student?.id || null
  );
  const { user } = useAuth();
  const { open: openConversation } = useOpenConversation('/tutor-dashboard');

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {student.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StudentOverview
              student={student}
              onViewNotes={() => setActiveTab('notes')}
              onViewMessages={() => {
                if (user?.id) openConversation(student.id, user.id);
              }}
            />
          </TabsContent>

          <TabsContent value="notes">
            <StudentNotes
              notes={notes}
              onAddNote={addNote}
              loading={loading}
              creating={creating}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailsDialog;
