
import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './tutor-scheduler/useSchedulerFilters';
import useEventHandlers from './tutor-scheduler/useEventHandlers';
import useSchedulerRealtime from './tutor-scheduler/useSchedulerRealtime';
import useStudentContent from './tutor-scheduler/useStudentContent';
import useSchedulerData from './tutor-scheduler/useSchedulerData';
import { useClassLogsQuery } from './queries/useClassLogsQuery';
import { toast } from 'sonner';

export function useTutorScheduler() {
  // Load class data from backend
  const {
    classes: classList,
    createClass,
    updateClass,
    deleteClass,
    allSubjects,
    isLoading: isClassLoading
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

  // Create realtime subscription
  useSchedulerRealtime(
    scheduledClasses,
    setScheduledClasses,
    selectedEvent,
    setSelectedEvent,
    setIsViewEventOpen
  );

  // Sync with classList when it changes
  useEffect(() => {
    if (classList && classList.length > 0) {
      setScheduledClasses(classList);
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
      // Don't compare its return value with true/false directly
      await createClass(newClassEvent);
      
      // Since we've reached this point without errors, consider it a success
      resetNewEventForm();
      setIsAddEventOpen(false);
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

      // Call the updateClass function without comparing return value to boolean
      await updateClass(event.id, updatedEvent);
      
      // Since we've reached this point without errors, consider it a success
      setSelectedEvent(event);
      setIsEditMode(false);
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update class');
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Call the deleteClass function without comparing return value to boolean
      await deleteClass(eventId);
      
      // Since we've reached this point without errors, consider it a success
      setIsViewEventOpen(false);
      setSelectedEvent(null);
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
  };
}

export default useTutorScheduler;
