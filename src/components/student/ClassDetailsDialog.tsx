
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ClassSessionDetail from "./ClassSessionDetail";
import { StudentContent } from "@/components/shared/StudentContent";
import { StudentMessage, StudentUpload } from "@/types/classTypes";
import { ClassItem, ClassSession } from "@/types/classTypes";

interface ClassDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: ClassItem | null;
  studentUploads: StudentUpload[];
  studentMessages: StudentMessage[];
  onFileUpload: (classId: string, file: File, note: string) => void;
  onSendMessage: (classId: string, message: string) => void;
}

const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  open,
  onOpenChange,
  selectedClass,
  studentUploads,
  studentMessages,
  onFileUpload,
  onSendMessage
}) => {
  if (!selectedClass) return null;
  
  const classSession: ClassSession = {
    id: selectedClass.id,
    title: selectedClass.title,
    subjectId: selectedClass.subjectId || selectedClass.subject,
    tutorName: selectedClass.tutorName,
    date: selectedClass.date,
    startTime: selectedClass.startTime,
    endTime: selectedClass.endTime,
    zoomLink: selectedClass.zoomLink,
    recurring: selectedClass.recurring || false,
    studentName: selectedClass.studentName
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedClass?.title || 'Class Details'}</DialogTitle>
        </DialogHeader>
        
        {selectedClass && (
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Class Details</TabsTrigger>
              <TabsTrigger value="materials">Materials & Communication</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <ClassSessionDetail session={classSession} />
            </TabsContent>
            
            <TabsContent value="materials" className="space-y-4">
              <StudentContent
                classId={selectedClass.id}
                uploads={studentUploads}
                messages={studentMessages}
                onSendMessage={(message) => onSendMessage(selectedClass.id, message)}
                onFileUpload={(file, note) => onFileUpload(selectedClass.id, file, note)}
                showUploadControls={true}
              />
            </TabsContent>
          </Tabs>
        )}
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
