
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { createScheduledClass } from '@/services/classService';
import { QueryClient } from '@tanstack/react-query';

// Define a proper interface that matches ClassEvent for the create operation
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
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Adapter function to convert ClassEvent to CreateEventParams
  const createEventAdapter = async (event: ClassEvent): Promise<boolean> => {
    if (!event.tutorId) {
      toast.error("Missing tutor ID");
      return false;
    }
    
    return createEvent({
      title: event.title,
      tutorId: event.tutorId,
      studentId: event.studentId || '',
      date: event.date instanceof Date ? event.date : new Date(event.date),
      startTime: event.startTime,
      endTime: event.endTime,
      subject: event.subject,
      zoomLink: event.zoomLink || '',
      notes: event.notes || ''
    });
  };

  // Adapter function to convert string ID to ClassEvent for delete
  const deleteEventAdapter = async (eventId: string, isRecurring?: boolean): Promise<boolean> => {
    return handleDeleteEvent({ id: eventId } as ClassEvent);
  };

  const createEvent = async (eventData: CreateEventParams): Promise<boolean> => {
    if (isCreating) return false;
    
    try {
      setIsCreating(true);
      
      if (!eventData.title || !eventData.studentId || !eventData.subject) {
        toast.error("Please fill in all required fields");
        return false;
      }

      const formattedDate = format(eventData.date, 'yyyy-MM-dd');
      
      const classData = {
        title: eventData.title,
        tutor_id: eventData.tutorId,
        student_id: eventData.studentId,
        date: formattedDate,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        subject: eventData.subject,
        zoom_link: eventData.zoomLink || null,
        notes: eventData.notes || null,
      };
      
      const result = await createScheduledClass(classData);
      
      if (result) {
        toast.success("Class scheduled successfully");
        resetNewEventForm();
        setIsAddEventOpen(false);
        
        // Invalidate relevant queries for both tutor and student
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', eventData.tutorId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', eventData.tutorId] });
        queryClient.invalidateQueries({ queryKey: ['studentClasses', eventData.studentId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', eventData.studentId] });
        queryClient.invalidateQueries({ queryKey: ['studentDashboard', eventData.studentId] });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error(`Failed to schedule class: ${error.message}`);
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditEvent = async (event: ClassEvent): Promise<boolean> => {
    if (isUpdating) return false;
    
    try {
      setIsUpdating(true);
      
      if (!event.id) {
        toast.error("Invalid event data");
        return false;
      }
      
      const formattedDate = event.date instanceof Date 
        ? format(event.date, 'yyyy-MM-dd') 
        : format(new Date(event.date), 'yyyy-MM-dd');
      
      const updateData = {
        title: event.title,
        date: formattedDate,
        start_time: event.startTime,
        end_time: event.endTime,
        subject: event.subject,
        zoom_link: event.zoomLink || null,
        notes: event.notes || null,
      };
      
      await updateClassMutation(event.id, updateData);
      
      toast.success("Class updated successfully");
      setIsViewEventOpen(false);
      setIsEditMode(false);
      
      // Invalidate relevant queries for both tutor and student
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] });
      }
      
      if (event.studentId) {
        queryClient.invalidateQueries({ queryKey: ['studentClasses', event.studentId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', event.studentId] });
        queryClient.invalidateQueries({ queryKey: ['studentDashboard', event.studentId] });
      }
      
      return true;
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast.error(`Failed to update class: ${error.message}`);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEvent = async (event: ClassEvent): Promise<boolean> => {
    if (isDeleting || !event.id) return false;
    
    try {
      setIsDeleting(true);
      
      await deleteClassMutation(event.id);
      
      toast.success("Class deleted successfully");
      setIsViewEventOpen(false);
      setSelectedEvent(null);
      
      // Invalidate relevant queries for both tutor and student
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] });
      }
      
      if (event.studentId) {
        queryClient.invalidateQueries({ queryKey: ['studentClasses', event.studentId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', event.studentId] });
        queryClient.invalidateQueries({ queryKey: ['studentDashboard', event.studentId] });
      }
      
      return true;
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error(`Failed to delete class: ${error.message}`);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleCreateEvent: createEventAdapter,
    handleEditEvent,
    handleDeleteEvent: deleteEventAdapter,
    isCreating,
    isUpdating,
    isDeleting,
    createEvent,
  };
};
