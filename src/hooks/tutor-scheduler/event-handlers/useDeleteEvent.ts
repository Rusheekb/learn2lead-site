
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { deleteScheduledClass } from '@/services/class'; // Updated import


export const useDeleteEvent = (
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Save the event before deletion for analytics tracking
      const eventToDelete = scheduledClasses.find(event => event.id === eventId);
      
      const success = await deleteScheduledClass(eventId);

      if (success) {
        setScheduledClasses(
          scheduledClasses.filter((event) => event.id !== eventId)
        );
        setIsViewEventOpen(false);
        
        // Class deleted successfully
        if (eventToDelete) {
          console.log('Class deleted:', eventId);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting class event:', error);
      toast.error('Failed to delete class');
      return false;
    }
  };

  return { handleDeleteEvent };
};
