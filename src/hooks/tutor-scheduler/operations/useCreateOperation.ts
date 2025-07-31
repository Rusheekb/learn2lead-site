
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { createScheduledClass } from '@/services/class-operations/create/createScheduledClass';
import { QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export interface CreateEventParams {
  title: string;
  tutorId: string;
  studentId: string;
  date: Date;
  startTime: string;
  endTime: string;
  subject: string;
  zoomLink?: string | null;
  notes?: string | null;
  relationshipId?: string;  // Important: Include the relationshipId
}

export const useCreateOperation = (queryClient: QueryClient) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { user } = useAuth();
  
  const createEvent = async (eventData: CreateEventParams): Promise<boolean> => {
    if (isCreating) return false;
    
    try {
      setIsCreating(true);
      
      // Make sure we have a tutor ID - use the current user's ID if not specified
      const tutorId = eventData.tutorId || user?.id;
      if (!tutorId) {
        console.error("No tutor ID available");
        toast.error("Missing tutor ID. Please ensure you're logged in as a tutor.");
        return false;
      }

      // Make a best effort with validation but don't block on it
      if (!eventData.title) {
        toast.error("Title is required");
        return false;
      }

      if (!eventData.studentId) {
        toast.error("Student selection is required");
        return false;
      }

      if (!eventData.relationshipId) {
        toast.error("Student relationship is required for scheduling classes");
        return false;
      }

      // Use the local date without timezone conversion to avoid off-by-one day issues
      const formattedDate = format(eventData.date, 'yyyy-MM-dd');
      
      // Modified to match CreateScheduledClassInput exactly
      const classData = {
        title: eventData.title,
        tutor_id: tutorId,
        student_id: eventData.studentId,
        date: formattedDate,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        subject: eventData.subject || "General",
        zoom_link: eventData.zoomLink || null, // Now explicitly handles null
        notes: eventData.notes || null, 
        relationship_id: eventData.relationshipId
      };
      
      console.log("Creating scheduled class with data:", classData);
      
      // Use the more complete createScheduledClass implementation
      const result = await createScheduledClass(classData);
      
      if (result) {
        toast.success("Class scheduled successfully");
        
        // Invalidate relevant queries for both tutor and student
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', tutorId] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', tutorId] });
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
    // Use current user ID as fallback for tutorId
    const tutorId = event.tutorId || user?.id;
    
    if (!tutorId) {
      toast.error("Missing tutor ID. Please ensure you're logged in as a tutor.");
      return false;
    }
    
    if (!event.relationshipId) {
      toast.error("Missing relationship ID. Please select a student from the dropdown.");
      return false;
    }
    
    // Be lenient with required fields
    const studentId = event.studentId || '';
    
    return createEvent({
      title: event.title || 'New Class Session',
      tutorId: tutorId,
      studentId: studentId,
      date: event.date instanceof Date ? event.date : new Date(event.date),
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      subject: event.subject || 'General',
      zoomLink: event.zoomLink || null, // Allow null
      notes: event.notes || null, // Allow null
      relationshipId: event.relationshipId
    });
  };

  return { createEvent, createEventAdapter, isCreating };
};
