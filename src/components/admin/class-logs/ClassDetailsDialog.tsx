import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentContent from "../../shared/StudentContent.tsx";
import { StatusBadge, AttendanceBadge } from "./BadgeComponents";
import { MessageCountBadge } from "@/components/shared/ClassBadges";

interface ClassDetailsDialogProps {
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  selectedClass: any;
  activeDetailsTab: string;
  setActiveDetailsTab: (tab: string) => void;
  studentUploads: any[];
  studentMessages: any[];
  handleDownloadFile: (uploadId: number) => Promise<void>;
  handleMarkMessageRead: (messageId: number) => Promise<void>;
  getUnreadMessageCount: (classId: number) => number;
  formatTime: (time: string) => string;
}

const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  isDetailsOpen,
  setIsDetailsOpen,
  selectedClass,
  activeDetailsTab,
  setActiveDetailsTab,
  studentUploads,
  studentMessages,
  handleDownloadFile,
  handleMarkMessageRead,
  getUnreadMessageCount,
  formatTime
}) => {
  if (!selectedClass) return null;

  return (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{selectedClass?.title}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Class Details</TabsTrigger>
            <TabsTrigger value="student-content">
              Student Content
              <MessageCountBadge count={getUnreadMessageCount(selectedClass.id)} />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                <p>{selectedClass.subject}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <div><StatusBadge status={selectedClass.status} /></div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Tutor</h4>
                <p>{selectedClass.tutorName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Student</h4>
                <p>{selectedClass.studentName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Date</h4>
                <p>{new Date(selectedClass.date).toLocaleDateString()}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Time</h4>
                <p>{formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Attendance</h4>
                <div><AttendanceBadge attendance={selectedClass.attendance} /></div>
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
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Notes</h4>
              <p className="mt-1 text-gray-700">
                {selectedClass.notes || "No notes recorded for this class."}
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="student-content" className="space-y-4 pt-4">
            <StudentContent 
              classId={selectedClass.id}
              uploads={studentUploads}
              messages={studentMessages}
              onDownload={handleDownloadFile}
              onMarkAsRead={handleMarkMessageRead}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
