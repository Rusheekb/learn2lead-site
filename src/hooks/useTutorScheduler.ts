
import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './tutor-scheduler/useSchedulerFilters';
import useEventHandlers from './tutor-scheduler/useEventHandlers';
import useSchedulerRealtime from './tutor-scheduler/useSchedulerRealtime';
import useStudentContent from './tutor-scheduler/useStudentContent';
import useSchedulerData from './tutor-scheduler/useSchedulerData';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useSchedulerCore } from './tutor-scheduler/useSchedulerCore';
import { useEventRefresh } from './tutor-scheduler/useEventRefresh';
import { useProfile } from '@/hooks/useProfile';

export function useTutorScheduler() {
  // Use the core hook to get most of the functionality
  const core = useSchedulerCore();
  const { profile } = useProfile(); // Get the profile data
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use the core event handlers directly
  const handleCreateEvent = core.baseCreateEvent;
  const handleEditEvent = core.baseEditEvent;
  const handleDeleteEvent = core.baseDeleteEvent;
  const handleDuplicateEvent = core.handleDuplicateEvent;

  // Use scheduler realtime hook to get real-time updates
  useSchedulerRealtime(
    core.scheduledClasses,
    core.setScheduledClasses,
    core.selectedEvent,
    core.setSelectedEvent,
    core.setIsViewEventOpen
  );

  // Hook for student content
  const {
    studentUploads,
    studentMessages,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
  } = useStudentContent(core.selectedEvent);

  // Hook for refreshing events
  const { refreshEvent } = useEventRefresh();

  // Apply filters to create filtered list
  const filteredClasses = core.applyFilters(core.scheduledClasses);
  const isLoading = core.isLoading;

  // Make sure we have fresh data whenever this hook is used
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
    }
  }, [user?.id, queryClient]);

  return {
    // State
    selectedDate: core.selectedDate,
    setSelectedDate: core.setSelectedDate,
    isAddEventOpen: core.isAddEventOpen,
    setIsAddEventOpen: core.setIsAddEventOpen,
    isViewEventOpen: core.isViewEventOpen,
    setIsViewEventOpen: core.setIsViewEventOpen,
    selectedEvent: core.selectedEvent,
    setSelectedEvent: core.setSelectedEvent,
    activeEventTab: core.activeEventTab,
    setActiveEventTab: core.setActiveEventTab,
    isEditMode: core.isEditMode,
    setIsEditMode: core.setIsEditMode,
    searchTerm: core.searchTerm,
    setSearchTerm: core.setSearchTerm,
    subjectFilter: core.subjectFilter,
    setSubjectFilter: core.setSubjectFilter,
    studentFilter: core.studentFilter,
    setStudentFilter: core.setStudentFilter,
    scheduledClasses: core.scheduledClasses,
    studentUploads,
    studentMessages,
    isLoading,
    newEvent: core.newEvent,
    setNewEvent: core.setNewEvent,
    filteredClasses,
    allSubjects: core.allSubjects,
    currentUser: profile, // Use the profile data instead of auth user

    // Methods
    handleSelectEvent: core.handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
    resetNewEventForm: core.resetNewEventForm,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
    refreshEvent: () => refreshEvent(core.selectedEvent, core.setSelectedEvent, core.setScheduledClasses),
    refetchClasses: () => queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user?.id] }),
  };
}

export default useTutorScheduler;
