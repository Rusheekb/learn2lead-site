
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime } from "@/utils/dateTimeUtils";
import StudentContent from "../shared/StudentContent";
import ClassContentUpload from "../shared/ClassContentUpload";
import { StudentUpload, StudentMessage } from "../shared/StudentContent";

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
  onSendMessage,
}) => {
  if (!selectedClass) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedClass.title}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Class Details</TabsTrigger>
            <TabsTrigger value="content">Content & Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                <p>{selectedClass.subject}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Tutor</h4>
                <p>{selectedClass.tutorName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date</h4>
                <p>{selectedClass.date}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Time</h4>
                <p>{formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Zoom Link</h4>
              <a 
                href={selectedClass.zoomLink}
                target="_blank" 
                rel="noopener noreferrer"
                className="text-tutoring-blue hover:underline"
              >
                {selectedClass.zoomLink}
              </a>
            </div>
            
            {selectedClass.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                <p>{selectedClass.notes}</p>
              </div>
            )}
            
            <ClassContentUpload 
              classId={selectedClass.id}
              onUpload={(file, note) => onFileUpload(selectedClass.id, file, note)}
              onMessage={(message) => onSendMessage(selectedClass.id, message)}
            />
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4 pt-4">
            <StudentContent 
              classId={selectedClass.id}
              uploads={studentUploads}
              messages={studentMessages}
            />
            
            <div className="pt-4 border-t">
              <ClassContentUpload 
                classId={selectedClass.id}
                onUpload={(file, note) => onFileUpload(selectedClass.id, file, note)}
                onMessage={(message) => onSendMessage(selectedClass.id, message)}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
