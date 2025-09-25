
import React from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { ClassDialogs } from '../ClassDialogs';
import { mockStudents } from '../mock-data-students';
import { Profile } from '@/types/profile';

interface TutorSchedulerDialogsProps {
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
  onCreateEvent: (event: ClassEvent) => Promise<boolean>;
  onEditEvent: (event: ClassEvent) => Promise<boolean>;
  onDuplicateEvent: (event: ClassEvent) => void;
  onDeleteEvent: (eventId: string, isRecurring?: boolean) => Promise<boolean>;
  onResetForm: () => void;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onDownloadFile: (uploadId: string) => Promise<void>;
  getUnreadMessageCount: (classId: string) => number;
  refreshEvent?: () => Promise<void>;
  currentUser?: Profile | null; // Using the Profile type from @/types/profile
}

const TutorSchedulerDialogs: React.FC<TutorSchedulerDialogsProps> = ({
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
  onCreateEvent,
  onEditEvent,
  onDuplicateEvent,
  onDeleteEvent,
  onResetForm,
  onMarkAsRead,
  onDownloadFile,
  getUnreadMessageCount,
  refreshEvent,
  currentUser,
}) => {
  return (
    <ClassDialogs
      isAddEventOpen={isAddEventOpen}
      isEditEventOpen={false}
      isViewEventOpen={isViewEventOpen}
      selectedEvent={selectedEvent}
      onCloseDialogs={() => {
        setIsViewEventOpen(false);
        setIsAddEventOpen(false);
      }}
      onRefreshData={() => {}}
    />
  );
};

export default TutorSchedulerDialogs;
