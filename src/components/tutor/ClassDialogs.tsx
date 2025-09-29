import React from 'react';
import AddClassDialog from './dialogs/AddClassDialog';
import ViewClassDialog from './dialogs/ViewClassDialog';
import { ClassEvent } from '@/types/tutorTypes';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClassDialogsProps {
  isAddEventOpen: boolean;
  isEditEventOpen: boolean;
  isViewEventOpen: boolean;
  selectedEvent: ClassEvent | null;
  onCloseDialogs: () => void;
  onRefreshData: () => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCreateEvent: (event: ClassEvent) => Promise<boolean>;
  currentUser?: any;
}

export function ClassDialogs({
  isAddEventOpen,
  isEditEventOpen,
  isViewEventOpen,
  selectedEvent,
  onCloseDialogs,
  onRefreshData,
  newEvent,
  setNewEvent,
  onCreateEvent,
  currentUser,
}: ClassDialogsProps) {
  const handleDeleteEvent = async (eventId: string, isRecurring?: boolean) => {
    try {
      // Import the delete service
      const { deleteScheduledClass } = await import('@/services/class/delete');
      const success = await deleteScheduledClass(eventId);
      if (success) {
        onRefreshData();
        onCloseDialogs();
      }
      return success;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  };

  return (
    <>
      <AddClassDialog
        isOpen={isAddEventOpen}
        setIsOpen={(open: boolean) => !open && onCloseDialogs()}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        onCreateEvent={onCreateEvent}
        onCancel={onCloseDialogs}
        currentUser={currentUser}
      />

      {selectedEvent && (
        <ViewClassDialog
          isOpen={isViewEventOpen}
          setIsOpen={(open: boolean) => !open && onCloseDialogs()}
          selectedEvent={selectedEvent}
          setIsEditMode={() => {}}
          activeTab="details"
          setActiveTab={() => {}}
          studentMessages={[]}
          studentUploads={[]}
          onDuplicateEvent={() => {}}
          onDeleteEvent={handleDeleteEvent}
          onMarkAsRead={async () => {}}
          onDownloadFile={async () => {}}
          onViewFile={async () => {}}
          getUnreadMessageCount={() => 0}
          refreshEvent={async () => onRefreshData()}
        />
      )}
    </>
  );
}