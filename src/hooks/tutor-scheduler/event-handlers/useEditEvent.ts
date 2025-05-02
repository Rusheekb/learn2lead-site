
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { updateScheduledClass } from '@/services/classService';
import { analytics, EventName, EventCategory } from '@/services/analytics/analyticsService';

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
        
        // Track class edited event
        analytics.track({
          category: EventCategory.CLASS,
          name: EventName.CLASS_EDITED,
          properties: {
            classId: selectedEvent.id,
            title: selectedEvent.title,
            subject: selectedEvent.subject,
            date: typeof selectedEvent.date === 'string'
              ? selectedEvent.date
              : format(selectedEvent.date, 'yyyy-MM-dd'),
          }
        });
        
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
