
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { updateScheduledClass } from '@/services/class'; // Updated import


export const useEditEvent = (
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) => {
  const handleEditEvent = async (selectedEvent: ClassEvent | null) => {
    try {
      if (!selectedEvent) return false;

      const scheduledClass = {
        title: selectedEvent.title,
        date:
          typeof selectedEvent.date === 'string'
            ? selectedEvent.date
            : format(selectedEvent.date, 'yyyy-MM-dd'),
        start_time: selectedEvent.startTime,
        end_time: selectedEvent.endTime,
        subject: selectedEvent.subject,
        zoom_link: selectedEvent.zoomLink,
        notes: selectedEvent.notes,
      };

      const success = await updateScheduledClass(
        selectedEvent.id,
        scheduledClass
      );

      if (success) {
        setScheduledClasses(
          scheduledClasses.map((event) =>
            event.id === selectedEvent.id ? selectedEvent : event
          )
        );
        
        // Class edited successfully
        console.log('Class updated:', selectedEvent.id);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating class event:', error);
      toast.error('Failed to update class');
      return false;
    }
  };

  return { handleEditEvent };
};
