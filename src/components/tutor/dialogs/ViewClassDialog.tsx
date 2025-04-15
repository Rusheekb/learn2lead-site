
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Copy, Trash2 } from "lucide-react";
import { ClassEvent } from "@/types/tutorTypes";
import ClassEventDetails from "../ClassEventDetails";
import { StudentMessage, StudentUpload } from "@/types/classTypes";

interface ViewClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedEvent: ClassEvent | null;
  setIsEditMode: (isEdit: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  studentMessages: StudentMessage[];
  studentUploads: StudentUpload[];
  onDuplicateEvent: (event: ClassEvent) => void;
  onDeleteEvent: (eventId: string, isRecurring?: boolean) => void;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onDownloadFile: (uploadId: string) => Promise<void>;
  getUnreadMessageCount: (classId: string) => number;
}

const ViewClassDialog: React.FC<ViewClassDialogProps> = ({
  isOpen,
  setIsOpen,
  selectedEvent,
  setIsEditMode,
  activeTab,
  setActiveTab,
  studentMessages,
  studentUploads,
  onDuplicateEvent,
  onDeleteEvent,
  onMarkAsRead,
  onDownloadFile,
  getUnreadMessageCount,
}) => {
  if (!selectedEvent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{selectedEvent?.title}</DialogTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Class
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicateEvent(selectedEvent)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Class
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onDeleteEvent(selectedEvent.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Class
              </DropdownMenuItem>
              {selectedEvent.recurring && (
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDeleteEvent(selectedEvent.id, true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Recurring
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        
        <ClassEventDetails 
          selectedEvent={selectedEvent}
          studentMessages={studentMessages}
          studentUploads={studentUploads}
          onMarkAsRead={onMarkAsRead}
          onDownloadFile={onDownloadFile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadMessageCount={getUnreadMessageCount(selectedEvent.id)}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewClassDialog;
