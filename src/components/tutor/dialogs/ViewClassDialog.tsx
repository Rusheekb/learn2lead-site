
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit2, Copy, Trash2 } from 'lucide-react';
import { ClassEvent } from '@/types/tutorTypes';
import ClassEventDetails from '../ClassEventDetails';
import { StudentMessage, StudentUpload } from '@/types/classTypes';
import { format } from 'date-fns';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import EditClassDialog from './EditClassDialog';
import { parseDateToLocal } from '@/utils/safeDateUtils';

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
  onDeleteEvent: (eventId: string, isRecurring?: boolean) => Promise<boolean>;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onDownloadFile: (uploadId: string) => Promise<void>;
  onViewFile: (uploadId: string) => Promise<void>;
  getUnreadMessageCount: (classId: string) => number;
  refreshEvent?: () => Promise<void>;
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
  onViewFile,
  getUnreadMessageCount,
  refreshEvent,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteRecurring, setDeleteRecurring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!selectedEvent) return null;

  // Ensure we properly format event dates for display
  const formatEventDate = (date: Date | string | undefined) => {
    if (!date) return '';
    try {
      const dateObj = parseDateToLocal(date);
      if (isNaN(dateObj.getTime())) return String(date);
      return format(dateObj, 'MMMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(date);
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = (recurring = false) => {
    setDeleteRecurring(recurring);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteEvent(selectedEvent.id, deleteRecurring);
      setIsDeleteDialogOpen(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditComplete = () => {
    setIsEditDialogOpen(false);
    if (refreshEvent) {
      refreshEvent();
    }
  };

  // Add formatted date to the event if needed
  const eventWithFormattedDate = {
    ...selectedEvent,
    formattedDate: formatEventDate(selectedEvent.date),
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] px-4 sm:px-8 w-[calc(100vw-2rem)] sm:w-auto">
          <div className="flex flex-col h-full max-h-[calc(90vh-4rem)]">
            <DialogHeader className="flex flex-row items-center justify-between flex-shrink-0">
              <DialogTitle className="text-xl sm:text-2xl break-words pr-8">{selectedEvent?.title}</DialogTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Class
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicateEvent(selectedEvent)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Class
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDelete(false)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Class
                  </DropdownMenuItem>
                  {selectedEvent.recurring && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Recurring
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4">
              <ClassEventDetails
                selectedEvent={eventWithFormattedDate}
                studentUploads={studentUploads}
                onDownloadFile={onDownloadFile}
                onViewFile={onViewFile}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                refreshEvent={refreshEvent}
              />
            </div>

            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <EditClassDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        classEvent={selectedEvent}
        onUpdate={handleEditComplete}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteRecurring ? 'All Recurring ' : ''}Class${deleteRecurring ? 'es' : ''}`}
        description={
          deleteRecurring
            ? 'This will permanently delete all recurring instances of this class. This action cannot be undone.'
            : 'This will permanently delete this class. This action cannot be undone.'
        }
        confirmText={`Delete ${deleteRecurring ? 'All' : 'Class'}`}
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
};

export default ViewClassDialog;
