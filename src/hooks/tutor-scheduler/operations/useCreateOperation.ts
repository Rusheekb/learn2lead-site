
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { createScheduledClass } from '@/services/class';
import { QueryClient } from '@tanstack/react-query';

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

export const useCreateOperation = (queryClient: QueryClient) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  
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

  return { createEvent, createEventAdapter, isCreating };
};
