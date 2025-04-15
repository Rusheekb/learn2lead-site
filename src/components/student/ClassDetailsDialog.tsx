
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ClassSessionDetail from "./ClassSessionDetail";
import { StudentUpload, StudentMessage } from "../shared/StudentContent"; 
import * as StudentContent from "../shared/StudentContent";

interface ClassItem {
  id: number;
  title: string;
  subject: string;
  tutorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  attendance: string;
  zoomLink: string;
  notes: string;
}

interface ClassDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: ClassItem | null;
  studentUploads: StudentUpload[];
  studentMessages: StudentMessage[];
  onFileUpload: (classId: number, file: File, note: string) => void;
  onSendMessage: (classId: number, message: string) => void;
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
              <ClassSessionDetail session={selectedClass} />
            </TabsContent>
            
            <TabsContent value="materials" className="space-y-4">
              <StudentContent.default
                classId={selectedClass.id.toString()}
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
