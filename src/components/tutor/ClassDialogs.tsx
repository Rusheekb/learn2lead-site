import React, { useState, useEffect, useCallback } from 'react';
import AddClassDialog from './dialogs/AddClassDialog';
import ViewClassDialog from './dialogs/ViewClassDialog';
import { ClassEvent } from '@/types/tutorTypes';
import { StudentUpload } from '@/types/classTypes';
import {
  fetchClassUploads,
  downloadClassFile,
  viewClassFile,
} from '@/services/classUploadsService';
import { logger } from '@/lib/logger';

const log = logger.create('ClassDialogs');

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
  const [activeTab, setActiveTab] = useState('details');
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);

  const loadUploads = useCallback(async () => {
    if (!selectedEvent?.id) return;
    const uploads = await fetchClassUploads(selectedEvent.id);
    setStudentUploads(uploads);
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (isViewEventOpen && selectedEvent?.id) {
      setActiveTab('details');
      loadUploads();
    }
  }, [isViewEventOpen, selectedEvent?.id, loadUploads]);

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
      log.error('Delete failed:', error);
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          studentUploads={studentUploads}
          onDeleteEvent={handleDeleteEvent}
          onDownloadFile={async (id) => {
            await downloadClassFile(id);
          }}
          onViewFile={async (id) => {
            await viewClassFile(id);
          }}
          refreshEvent={async () => {
            onRefreshData();
            await loadUploads();
          }}
        />
      )}
    </>
  );
}
