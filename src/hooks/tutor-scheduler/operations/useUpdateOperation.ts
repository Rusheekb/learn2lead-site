
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import { updateScheduledClass } from '@/services/class';
import { QueryClient } from '@tanstack/react-query';

export const useUpdateOperation = (queryClient: QueryClient, userId?: string) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  
  const handleEditEvent = async (event: ClassEvent): Promise<boolean> => {
    if (isUpdating || !event.id) return false;
    
    try {
      setIsUpdating(true);
      
      const formattedDate = event.date instanceof Date 
        ? format(event.date, 'yyyy-MM-dd') 
        : format(new Date(event.date), 'yyyy-MM-dd');
      
      const updateData = {
        title: event.title,
        date: formattedDate,
        start_time: event.startTime,
        end_time: event.endTime,
        subject: event.subject,
        zoom_link: event.zoomLink || null,
        notes: event.notes || null,
      };
      
      const success = await updateScheduledClass(event.id, updateData);
      
      if (success) {
        toast.success("Class updated successfully");
        
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
      console.error("Error updating event:", error);
      toast.error(`Failed to update class: ${error.message}`);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { handleEditEvent, isUpdating };
};
