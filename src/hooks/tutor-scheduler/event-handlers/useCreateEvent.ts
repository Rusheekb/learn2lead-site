
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { createScheduledClass } from '@/services/class'; // Updated import

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
        // Don't add to local state - let the real-time subscription handle it
        // This prevents duplicate classes from appearing
        
        // Class created successfully
        console.log('Class created:', newClassId);
        
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
