
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Copy, Trash2 } from "lucide-react";
import { ClassEvent } from "@/types/tutorTypes";
import NewClassEventForm from "./NewClassEventForm";
import ClassEventDetails from "./ClassEventDetails";
import { StudentMessage, StudentUpload } from "../shared/StudentContent";

interface ClassDialogsProps {
  isViewEventOpen: boolean;
  setIsViewEventOpen: (isOpen: boolean) => void;
  isAddEventOpen: boolean;
  setIsAddEventOpen: (isOpen: boolean) => void;
  selectedEvent: ClassEvent | null;
  isEditMode: boolean;
  setIsEditMode: (isEdit: boolean) => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  activeEventTab: string;
  setActiveEventTab: (tab: string) => void;
  studentMessages: StudentMessage[];
  studentUploads: StudentUpload[];
  students: any[];
  onCreateEvent: () => void;
  onEditEvent: () => void;
  onDuplicateEvent: (event: ClassEvent) => void;
  onDeleteEvent: (eventId: number, isRecurring?: boolean) => void;
  onResetForm: () => void;
  onMarkAsRead: (messageId: number) => void;
  onDownloadFile: (uploadId: number) => void;
  getUnreadMessageCount: (classId: number) => number;
}

const ClassDialogs: React.FC<ClassDialogsProps> = ({
  isViewEventOpen,
  setIsViewEventOpen,
  isAddEventOpen,
  setIsAddEventOpen,
  selectedEvent,
  isEditMode,
  setIsEditMode,
  newEvent,
  setNewEvent,
  activeEventTab,
  setActiveEventTab,
  studentMessages,
  studentUploads,
  students,
  onCreateEvent,
  onEditEvent,
  onDuplicateEvent,
  onDeleteEvent,
  onResetForm,
  onMarkAsRead,
  onDownloadFile,
  getUnreadMessageCount,
}) => {
  return (
    <>
      <Dialog open={isViewEventOpen} onOpenChange={setIsViewEventOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            {selectedEvent && (
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
            )}
          </DialogHeader>
          
          {selectedEvent && (
            <>
              {isEditMode ? (
                <div className="py-4">
                  <NewClassEventForm 
                    newEvent={{
                      title: selectedEvent.title,
                      date: selectedEvent.date,
                      startTime: selectedEvent.startTime,
                      endTime: selectedEvent.endTime,
                      studentId: selectedEvent.studentId.toString(),
                      subject: selectedEvent.subject,
                      zoomLink: selectedEvent.zoomLink,
                      notes: selectedEvent.notes,
                      recurring: selectedEvent.recurring,
                      recurringDays: selectedEvent.recurringDays || []
                    }}
                    setNewEvent={(event) => setNewEvent({ ...selectedEvent, ...event })}
                    students={students}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </Button>
                    <Button onClick={onEditEvent}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <ClassEventDetails 
                  selectedEvent={selectedEvent}
                  studentMessages={studentMessages}
                  studentUploads={studentUploads}
                  onMarkAsRead={onMarkAsRead}
                  onDownloadFile={onDownloadFile}
                  activeTab={activeEventTab}
                  setActiveTab={setActiveEventTab}
                  unreadMessageCount={getUnreadMessageCount(selectedEvent.id)}
                />
              )}
            </>
          )}
          
          {!isEditMode && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewEventOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Class</DialogTitle>
          </DialogHeader>
          
          <NewClassEventForm 
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            students={students}
          />
          
          <DialogFooter>
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => {
                setIsAddEventOpen(false);
                onResetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={onCreateEvent}>Schedule Class</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClassDialogs;
