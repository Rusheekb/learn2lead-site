
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Updated parameter types to match what's being passed from react-query
export function useClassOperations(
  createClass: (event: any) => Promise<any>,
  updateClass: (id: string, updates: any) => Promise<any>,
  deleteClass: (id: string) => Promise<any>,
  resetNewEventForm: () => void,
  setIsAddEventOpen: (isOpen: boolean) => void,
  setIsViewEventOpen: (isOpen: boolean) => void,
  setSelectedEvent: (event: ClassEvent | null) => void,
  setIsEditMode: (isEditMode: boolean) => void,
  queryClient: any,
  user: any
) {
  // Wrap backend operations
  const handleCreateEvent = async (event: ClassEvent) => {
    try {
      // Fix the issue with toISOString by ensuring date is a Date object
      const dateObject = event.date instanceof Date
        ? event.date 
        : new Date(event.date);
      
      // Create a new class with properly formatted date
      const newClassEvent = {
        ...event,
        date: dateObject.toISOString().split('T')[0]
      };
      
      // Call the createClass function and handle the response
      await createClass(newClassEvent);
      
      // Since we've reached this point without errors, consider it a success
      resetNewEventForm();
      setIsAddEventOpen(false);
      
      // Make sure to invalidate the tutor's classes query
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
      }
      
      // Also invalidate the student's classes query to ensure they see the new class immediately
      if (event.studentId) {
        queryClient.invalidateQueries({ queryKey: ['studentClasses', event.studentId] });
        
        // Additional invalidation for student-related views
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', event.studentId] });
        queryClient.invalidateQueries({ queryKey: ['studentDashboard', event.studentId] });
      }
      
      // General refresh for any shared component data
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses'] });
      
      toast.success('Class scheduled successfully! Student has been notified.');
      
      return true;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create class');
      return false;
    }
  };

  const handleEditEvent = async (event: ClassEvent) => {
    try {
      if (!event) return false;
      
      // Fix the issue with toISOString by ensuring date is a Date object
      const dateObject = event.date instanceof Date
        ? event.date 
        : new Date(event.date);
      
      // Update the class with properly formatted date
      const updatedEvent = {
        ...event,
        date: dateObject.toISOString().split('T')[0]
      };

      // Call the updateClass function
      await updateClass(event.id, updatedEvent);
      
      // Since we've reached this point without errors, consider it a success
      setSelectedEvent(event);
      setIsEditMode(false);
      
      // Make sure to invalidate the tutor's classes query
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        
        // Also invalidate the specific student's classes if student ID is available
        if (event.studentId) {
          queryClient.invalidateQueries({ queryKey: ['studentClasses', event.studentId] });
          queryClient.invalidateQueries({ queryKey: ['upcomingClasses', event.studentId] });
          queryClient.invalidateQueries({ queryKey: ['studentDashboard', event.studentId] });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update class');
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Save student ID before deleting for invalidation
      const eventToDelete = await findEventById(eventId);
      const studentId = eventToDelete?.studentId;
      
      // Call the deleteClass function
      await deleteClass(eventId);
      
      // Since we've reached this point without errors, consider it a success
      setIsViewEventOpen(false);
      setSelectedEvent(null);
      
      // Make sure to invalidate the tutor's classes query
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        
        // Also invalidate the specific student's classes if student ID was captured
        if (studentId) {
          queryClient.invalidateQueries({ queryKey: ['studentClasses', studentId] });
          queryClient.invalidateQueries({ queryKey: ['upcomingClasses', studentId] });
          queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentId] });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete class');
      return false;
    }
  };

  // Helper function to find an event by ID from the database
  const findEventById = async (eventId: string) => {
    try {
      const { data } = await supabase
        .from('scheduled_classes')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (data) {
        return {
          id: data.id,
          studentId: data.student_id,
          tutorId: data.tutor_id,
          // Add other fields as needed
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching event details:', error);
      return null;
    }
  };

  // Create event with form reset
  const createEvent = async (event: ClassEvent) => {
    const success = await handleCreateEvent(event);
    if (success) {
      setIsAddEventOpen(false);
      resetNewEventForm();
    }
    return success;
  };

  return {
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    createEvent
  };
}
