
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { createScheduledClass } from '@/services/classService';
import { analytics, EventName, EventCategory } from '@/services/analytics/analyticsService';
import { useQueryClient } from '@tanstack/react-query';

export const useCreateEvent = (
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) => {
  const queryClient = useQueryClient();

  const handleCreateEvent = async (newEvent: any) => {
    try {
      if (!newEvent.title || !newEvent.studentId || !newEvent.subject) {
        toast.error('Please fill in all required fields');
        return false;
      }

      const scheduledClass = {
        title: newEvent.title,
        tutor_id: newEvent.tutorId,
        student_id: newEvent.studentId,
        date: format(newEvent.date, 'yyyy-MM-dd'),
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        subject: newEvent.subject,
        zoom_link: newEvent.zoomLink || null,
        notes: newEvent.notes || null,
      };

      const newClassId = await createScheduledClass(scheduledClass);

      if (newClassId) {
        const createdClass: ClassEvent = {
          id: newClassId,
          title: newEvent.title,
          tutorId: newEvent.tutorId,
          tutorName: 'Current Tutor', // Will be updated by realtime events
          studentId: newEvent.studentId,
          studentName: 'Student', // Will be updated by realtime events
          date: newEvent.date,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          subject: newEvent.subject,
          zoomLink: newEvent.zoomLink || null,
          notes: newEvent.notes || null,
        };

        setScheduledClasses([...scheduledClasses, createdClass]);
        
        // Track class creation event
        analytics.track({
          category: EventCategory.CLASS,
          name: EventName.CLASS_CREATED,
          properties: {
            classId: newClassId,
            title: newEvent.title,
            subject: newEvent.subject,
            studentId: newEvent.studentId,
            date: format(newEvent.date, 'yyyy-MM-dd'),
          }
        });
        
        // Invalidate student classes query
        if (newEvent.studentId) {
          queryClient.invalidateQueries({ queryKey: ['studentClasses', newEvent.studentId] });
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating class event:', error);
      toast.error('Failed to create new class');
      return false;
    }
  };

  return { handleCreateEvent };
};
