
import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './tutor-scheduler/useSchedulerFilters';
import useEventHandlers from './tutor-scheduler/useEventHandlers';
import useSchedulerRealtime from './tutor-scheduler/useSchedulerRealtime';
import useStudentContent from './tutor-scheduler/useStudentContent';
import useSchedulerData from './tutor-scheduler/useSchedulerData';
import { useClassLogsQuery } from './queries/useClassLogsQuery';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { TransformedClassLog } from '@/services/logs/types';
import { useSchedulerCore } from './tutor-scheduler/useSchedulerCore';
import { useClassOperations } from './tutor-scheduler/useClassOperations';
import { useEventRefresh } from './tutor-scheduler/useEventRefresh';
import { useProfile } from '@/hooks/useProfile';
import { Profile as ProfileType } from '@/types/profile';

export function useTutorScheduler() {
  // Use the core hook to get most of the functionality
  const core = useSchedulerCore();
  const { profile } = useProfile(); // Get the profile data

  // Use class operations hook for CRUD operations
  const {
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
    createEvent
  } = useClassOperations(
    // Convert each mutation function to return a Promise
    (event) => Promise.resolve(core.createClass(event)),
    (id, updates) => Promise.resolve(core.updateClass(id, updates)),
    (id) => Promise.resolve(core.deleteClass(id)),
    core.resetNewEventForm,
    core.setIsAddEventOpen,
    core.setIsViewEventOpen,
    core.setSelectedEvent,
    core.setIsEditMode,
    core.queryClient,
    core.user
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
  const isLoading = core.isClassLoading || core.isDataLoading;

  // Make sure we have fresh data whenever this hook is used
  useEffect(() => {
    if (core.user?.id) {
      core.refetchClasses();
      core.queryClient.invalidateQueries({ queryKey: ['scheduledClasses', core.user.id] });
    }
  }, [core.user?.id]);

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
    refetchClasses: core.refetchClasses,
  };
}

export default useTutorScheduler;
