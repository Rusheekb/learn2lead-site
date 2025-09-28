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
        <>
          <Dialog open={isEditEventOpen} onOpenChange={(open: boolean) => !open && onCloseDialogs()}>
            <DialogContent>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Edit Class</h2>
                <p className="mb-4">Edit functionality simplified</p>
                <Button onClick={onCloseDialogs}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>

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
            onDeleteEvent={async () => true}
            onMarkAsRead={async () => {}}
            onDownloadFile={async () => {}}
            onViewFile={async () => {}}
            getUnreadMessageCount={() => 0}
          />
        </>
      )}
    </>
  );
}