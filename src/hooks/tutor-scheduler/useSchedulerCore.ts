
import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import useSchedulerFilters from './useSchedulerFilters';
import useEventHandlers from './useEventHandlers';
import useSchedulerRealtime from './useSchedulerRealtime';
import useStudentContent from './useStudentContent';
import useSchedulerData from './useSchedulerData';
import { useClassLogsQuery } from '../queries/useClassLogsQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { TransformedClassLog } from '@/services/logs/types';

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
