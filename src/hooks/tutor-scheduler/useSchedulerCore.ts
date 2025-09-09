
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './useSchedulerFilters';
import useEventHandlers from './useEventHandlers';
import useStudentContent from './useStudentContent';
import useSchedulerData from './useSchedulerData';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useDataFetchingEffects } from './core-utils/useDataFetchingEffects';

export function useSchedulerCore() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // We don't need useClassLogsQuery for the scheduler since it fetches completed classes
  // The scheduler should only show scheduled classes, which are handled by useSchedulerData

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
    allSubjects,
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

  // Use data fetching effects - use the loadClasses function from useSchedulerData
  useDataFetchingEffects(user?.id, () => {}, queryClient);

  return {
    user,
    queryClient,
    allSubjects,
    isLoading: isDataLoading,
    refetchClasses: () => {}, // Not needed for scheduler
    selectedDate,
    setSelectedDate,
    isDataLoading,
    scheduledClasses,
    setScheduledClasses,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    newEvent,
    setNewEvent,
    resetNewEventForm,
    searchTerm,
    setSearchTerm,
    subjectFilter,
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    applyFilters,
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    handleSelectEvent,
    baseCreateEvent,
    baseEditEvent,
    baseDeleteEvent,
    handleDuplicateEvent
  };
}
