
import { useState } from 'react';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { deleteScheduledClass } from '@/services/class';
import { QueryClient } from '@tanstack/react-query';

export const useDeleteOperation = (queryClient: QueryClient, userId?: string) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  const handleDeleteEvent = async (event: ClassEvent): Promise<boolean> => {
    if (isDeleting || !event.id) return false;
    
    try {
      setIsDeleting(true);
      
      const success = await deleteScheduledClass(event.id);
      
      if (success) {
        toast.success("Class deleted successfully");
        
        // Invalidate relevant queries for both tutor and student
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['scheduledClasses', userId] });
          queryClient.invalidateQueries({ queryKey: ['upcomingClasses', userId] });
        }
        
        if (event.studentId) {
          queryClient.invalidateQueries({ queryKey: ['studentClasses', event.studentId] });
          queryClient.invalidateQueries({ queryKey: ['upcomingClasses', event.studentId] });
          queryClient.invalidateQueries({ queryKey: ['studentDashboard', event.studentId] });
        }
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error(`Failed to delete class: ${error.message}`);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Adapter function to convert string ID to ClassEvent for delete
  const deleteEventAdapter = async (eventId: string): Promise<boolean> => {
    return handleDeleteEvent({ id: eventId } as ClassEvent);
  };

  return { handleDeleteEvent, deleteEventAdapter, isDeleting };
};
