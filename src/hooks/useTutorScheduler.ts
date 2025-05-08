
import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './tutor-scheduler/useSchedulerFilters';
import useEventHandlers from './tutor-scheduler/useEventHandlers';
import useSchedulerRealtime from './tutor-scheduler/useSchedulerRealtime';
import useStudentContent from './tutor-scheduler/useStudentContent';
import useSchedulerData from './tutor-scheduler/useSchedulerData';
import { useClassLogsQuery } from './queries/useClassLogsQuery';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { TransformedClassLog } from '@/services/logs/types';

export function useTutorScheduler() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load class data from backend
  const {
    classes: classList,
    createClass,
    updateClass,
    deleteClass,
    allSubjects,
    isLoading: isClassLoading,
    refetch: refetchClasses
  } = useClassLogsQuery();

  // Get basic scheduler state
  const {
    selectedDate,
    setSelectedDate,
    isLoading: isDataLoading,
    scheduledClasses,
    setScheduledClasses,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    newEvent,
    setNewEvent,
    resetNewEventForm,
  } = useSchedulerData();

  // Use filter hook
  const {
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    applyFilters,
  } = useSchedulerFilters();

  // Use event handlers hook
  const {
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    handleSelectEvent,
    handleCreateEvent: baseCreateEvent,
    handleEditEvent: baseEditEvent,
    handleDeleteEvent: baseDeleteEvent,
    handleDuplicateEvent,
  } = useEventHandlers(
    scheduledClasses,
    setScheduledClasses,
    setIsViewEventOpen
  );

  // Create realtime subscription - this will be scoped to the current tutor
  useSchedulerRealtime(
    scheduledClasses,
    setScheduledClasses,
    selectedEvent,
    setSelectedEvent,
    setIsViewEventOpen
  );

  // Ensure we refetch classes when component mounts and user ID changes
  useEffect(() => {
    if (user?.id) {
      refetchClasses();
      // Enhanced invalidation to be more specific
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
    }
  }, [user?.id, refetchClasses, queryClient]);

  // Sync with classList when it changes
  useEffect(() => {
    if (classList && classList.length > 0) {
      // Convert TransformedClassLog to ClassEvent if needed
      const convertedClasses = classList.map((cls: TransformedClassLog | ClassEvent) => {
        if ('additionalInfo' in cls) { // It's a TransformedClassLog
          return {
            ...cls,
            title: cls.title || cls.classNumber || '',
            status: cls.additionalInfo?.includes('Status:') 
              ? cls.additionalInfo.split('Status:')[1].trim().split(' ')[0] as any
              : 'pending',
            attendance: cls.additionalInfo?.includes('Attendance:')
              ? cls.additionalInfo.split('Attendance:')[1].trim().split(' ')[0] as any
              : 'pending',
            zoomLink: cls.zoomLink || null,
            recurring: false,
            materials: [],
          } as ClassEvent;
        }
        return cls; // It's already a ClassEvent
      });
      
      setScheduledClasses(convertedClasses);
    }
  }, [classList, setScheduledClasses]);

  // Hook for accessing student content
  const {
    studentUploads,
    studentMessages,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
  } = useStudentContent(selectedEvent);

  // Apply filters to create filtered list
  const filteredClasses = applyFilters(scheduledClasses);
  const isLoading = isClassLoading || isDataLoading;

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
      const eventToDelete = scheduledClasses.find(event => event.id === eventId);
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

  // Create event with form reset
  const createEvent = async (event: ClassEvent) => {
    const success = await handleCreateEvent(event);
    if (success) {
      setIsAddEventOpen(false);
      resetNewEventForm();
    }
    return success;
  };

  // Add a function to refresh the selected event with the latest data
  const refreshEvent = async () => {
    if (!selectedEvent || !selectedEvent.id) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select('*, materials_url')
        .eq('id', selectedEvent.id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Update the selected event with the latest data
        const updatedEvent: ClassEvent = {
          ...selectedEvent,
          materialsUrl: data.materials_url || []
        };
        
        setSelectedEvent(updatedEvent);
        
        // Also update in the scheduledClasses array
        setScheduledClasses(prevClasses => 
          prevClasses.map(cls => 
            cls.id === selectedEvent.id ? updatedEvent : cls
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing event:', error);
    }
  };

  return {
    // State
    selectedDate,
    setSelectedDate,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    isEditMode,
    setIsEditMode,
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    scheduledClasses,
    studentUploads,
    studentMessages,
    isLoading,
    newEvent,
    setNewEvent,
    filteredClasses,
    allSubjects,

    // Methods
    handleSelectEvent,
    handleCreateEvent: createEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
    resetNewEventForm,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
    refreshEvent,
    refetchClasses,
  };
}

export default useTutorScheduler;
