
import React from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import ViewClassDialog from './dialogs/ViewClassDialog';
import EditClassForm from './dialogs/EditClassForm';
import AddClassDialog from './dialogs/AddClassDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  onDeleteEvent: (eventId: string, isRecurring?: boolean) => void;
  onResetForm: () => void;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onDownloadFile: (uploadId: string) => Promise<void>;
  getUnreadMessageCount: (classId: string) => number;
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
      {isEditMode && selectedEvent ? (
        <Dialog open={isViewEventOpen} onOpenChange={setIsViewEventOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <EditClassForm
              selectedEvent={selectedEvent}
              newEvent={newEvent}
              setNewEvent={setNewEvent}
              onCancel={() => setIsEditMode(false)}
              onSave={onEditEvent}
              students={students}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <ViewClassDialog
          isOpen={isViewEventOpen}
          setIsOpen={setIsViewEventOpen}
          selectedEvent={selectedEvent}
          setIsEditMode={setIsEditMode}
          activeTab={activeEventTab}
          setActiveTab={setActiveEventTab}
          studentMessages={studentMessages}
          studentUploads={studentUploads}
          onDuplicateEvent={onDuplicateEvent}
          onDeleteEvent={onDeleteEvent}
          onMarkAsRead={onMarkAsRead}
          onDownloadFile={onDownloadFile}
          getUnreadMessageCount={getUnreadMessageCount}
        />
      )}

      <AddClassDialog
        isOpen={isAddEventOpen}
        setIsOpen={setIsAddEventOpen}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        onCreateEvent={onCreateEvent}
        onResetForm={onResetForm}
      />
    </>
  );
};

export default ClassDialogs;
