import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './tutor-scheduler/useSchedulerFilters';
import useEventHandlers from './tutor-scheduler/useEventHandlers';
import useSchedulerRealtime from './tutor-scheduler/useSchedulerRealtime';
import useStudentContent from './tutor-scheduler/useStudentContent';
import useSchedulerData from './tutor-scheduler/useSchedulerData';

export function useTutorScheduler() {
  const {
    selectedDate,
    setSelectedDate,
    isLoading,
    scheduledClasses,
    setScheduledClasses,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    newEvent,
    setNewEvent,
    allSubjects,
    resetNewEventForm,
  } = useSchedulerData();

  const {
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    applyFilters,
  } = useSchedulerFilters();

  const {
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
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

  const {
    studentUploads,
    studentMessages,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
  } = useStudentContent(selectedEvent);

  // Apply filters to create filtered list
  const filteredClasses = applyFilters(scheduledClasses);

  // Handle event creation with form reset
  const createEvent = async () => {
    const success = await handleCreateEvent(newEvent);
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
