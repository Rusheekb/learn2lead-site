import React from 'react';
import { AddClassDialog } from './dialogs/AddClassDialog';
import { ViewClassDialog } from './dialogs/ViewClassDialog';
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
}

export function ClassDialogs({
  isAddEventOpen,
  isEditEventOpen,
  isViewEventOpen,
  selectedEvent,
  onCloseDialogs,
  onRefreshData,
}: ClassDialogsProps) {
  return (
    <>
      <AddClassDialog
        open={isAddEventOpen}
        onOpenChange={(open) => !open && onCloseDialogs()}
        onSuccess={onRefreshData}
      />

      {selectedEvent && (
        <>
          <Dialog open={isEditEventOpen} onOpenChange={(open) => !open && onCloseDialogs()}>
            <DialogContent>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Edit Class</h2>
                <p className="mb-4">Edit functionality simplified</p>
                <Button onClick={onCloseDialogs}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>

          <ViewClassDialog
            open={isViewEventOpen}
            onOpenChange={(open) => !open && onCloseDialogs()}
            classEvent={selectedEvent}
            onEdit={() => {
              onCloseDialogs();
            }}
          />
        </>
      )}
    </>
  );
}