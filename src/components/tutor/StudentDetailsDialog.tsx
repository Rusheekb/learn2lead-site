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
import { Student, StudentMessage, StudentNote } from '@/types/sharedTypes';
import StudentOverview from './StudentOverview';
import StudentMessages from './StudentMessages';
import StudentNotes from './StudentNotes';

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  studentMessages: StudentMessage[];
  studentNotes: StudentNote[];
  onSendMessage: (message: string) => void;
  onAddNote: (title: string, content: string) => void;
}

const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  open,
  onOpenChange,
  student,
  activeTab,
  setActiveTab,
  studentMessages,
  studentNotes,
  onSendMessage,
  onAddNote,
}) => {
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StudentOverview
              student={student}
              onViewMessages={() => setActiveTab('messages')}
              onViewNotes={() => setActiveTab('notes')}
            />
          </TabsContent>

          <TabsContent value="messages">
            <StudentMessages
              messages={studentMessages}
              onSendMessage={onSendMessage}
            />
          </TabsContent>

          <TabsContent value="notes">
            <StudentNotes notes={studentNotes} onAddNote={onAddNote} />
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
