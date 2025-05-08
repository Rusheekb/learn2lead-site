
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './useSchedulerFilters';
import useEventHandlers from './useEventHandlers';
import useStudentContent from './useStudentContent';
import useSchedulerData from './useSchedulerData';
import { useClassLogsQuery } from '../queries/useClassLogsQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useDataTransformations } from './core-utils/useDataTransformations';
import { useDataFetchingEffects } from './core-utils/useDataFetchingEffects';

export function useSchedulerCore() {
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

  // Use data transformations logic
  useDataTransformations(classList, setScheduledClasses);

  // Use data fetching effects
  useDataFetchingEffects(user?.id, refetchClasses, queryClient);

  return {
    user,
    queryClient,
    classList,
    createClass,
    updateClass,
    deleteClass,
    allSubjects,
    isClassLoading,
    refetchClasses,
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
