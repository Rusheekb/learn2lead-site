
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentContent } from "@/components/shared/StudentContent";
import { StatusBadge, AttendanceBadge } from "./BadgeComponents";
import { MessageCountBadge } from "@/components/shared/ClassBadges";
import { format } from "date-fns";

interface ClassDetailsDialogProps {
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  selectedClass: any;
  activeDetailsTab: string;
  setActiveDetailsTab: (tab: string) => void;
  studentUploads: any[];
  studentMessages: any[];
  handleDownloadFile: (uploadId: string) => Promise<void>;
  handleMarkMessageRead: (messageId: string) => Promise<void>;
  getUnreadMessageCount: (classId: string) => number;
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
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Date not available';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return format(dateObj, "MMM d, yyyy");
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(date);
    }
  };

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
                <p>{formatDate(selectedClass.date)}</p>
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
