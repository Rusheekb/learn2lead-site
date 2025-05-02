
import { useState } from 'react';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';

export const useDuplicateEvent = (
  handleCreateEvent: (event: any) => Promise<boolean>
) => {
  const handleDuplicateEvent = (event: ClassEvent) => {
    try {
      const duplicatedEvent = {
        ...event,
        title: `Copy of ${event.title}`,
        id: '', // Will be assigned by the backend
      };

      // Remove ID and use create function
      const { id, ...newEvent } = duplicatedEvent;

      // Create a newEvent object compatible with our form
      const formattedEvent = {
        title: newEvent.title,
        date: new Date(
          typeof newEvent.date === 'string' ? newEvent.date : newEvent.date
        ),
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        studentId: newEvent.studentId || '',
        subject: newEvent.subject,
        zoomLink: newEvent.zoomLink || '',
        notes: newEvent.notes || '',
        tutorId: newEvent.tutorId || '',
      };

      // Use createEvent to create a new class from the duplicate
      handleCreateEvent(formattedEvent);

      return true;
    } catch (error) {
      console.error('Error duplicating class event:', error);
      toast.error('Failed to duplicate class');
      return false;
    }
  };

  return { handleDuplicateEvent };
};
