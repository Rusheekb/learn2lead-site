
import { useState } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { QueryClient } from '@tanstack/react-query';
import { useCreateOperation } from './operations/useCreateOperation';
import { useUpdateOperation } from './operations/useUpdateOperation';
import { useDeleteOperation } from './operations/useDeleteOperation';
import { useDuplicateOperation } from './operations/useDuplicateOperation';

export interface CreateEventParams {
  title: string;
  tutorId: string;
  studentId: string;
  date: Date;
  startTime: string;
  endTime: string;
  subject: string;
  zoomLink?: string;
  notes?: string;
}

export const useClassOperations = (
  createClassMutation: (event: any) => Promise<any>,
  updateClassMutation: (id: string, updates: any) => Promise<any>,
  deleteClassMutation: (id: string) => Promise<any>,
  resetNewEventForm: () => void,
  setIsAddEventOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>,
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>,
  queryClient: QueryClient,
  user: any | null
) => {
  // Use the operation hooks
  const { createEvent, createEventAdapter, isCreating } = useCreateOperation(queryClient);
  const { handleEditEvent, isUpdating } = useUpdateOperation(queryClient, user?.id);
  const { handleDeleteEvent, deleteEventAdapter, isDeleting } = useDeleteOperation(queryClient, user?.id);
  const { handleDuplicateEvent } = useDuplicateOperation(createEventAdapter);

  return {
    handleCreateEvent: createEventAdapter,
    handleEditEvent,
    handleDeleteEvent: deleteEventAdapter,
    isCreating,
    isUpdating,
    isDeleting,
    createEvent,
    handleDuplicateEvent
  };
};

export default useClassOperations;
