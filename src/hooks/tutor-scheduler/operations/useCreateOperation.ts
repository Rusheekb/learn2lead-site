
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { createScheduledClass } from '@/services/class';
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
  zoomLink?: string;
  notes?: string;
  relationshipId?: string;  // Added relationshipId parameter
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

      const formattedDate = format(eventData.date, 'yyyy-MM-dd');
      
      const classData = {
        title: eventData.title,
        tutor_id: tutorId,
        student_id: eventData.studentId,
        date: formattedDate,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        subject: eventData.subject || "General",
        zoom_link: eventData.zoomLink || null,
        notes: eventData.notes || null,
        // Add relationship_id if available to comply with RLS policies
        relationship_id: eventData.relationshipId || null
      };
      
      console.log("Creating scheduled class with data:", classData);
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
      zoomLink: event.zoomLink || '',
      notes: event.notes || '',
      relationshipId: event.relationshipId
    });
  };

  return { createEvent, createEventAdapter, isCreating };
};
