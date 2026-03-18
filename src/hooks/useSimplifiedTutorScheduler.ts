import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

const log = logger.create('useSimplifiedTutorScheduler');
import { toast } from 'sonner';
import { createScheduledClass, createScheduledClassBatch } from '@/services/class/create';
import { formatClassEventDate, parseDateToLocal } from '@/utils/safeDateUtils';
import { addWeeks, startOfDay, isAfter, format } from 'date-fns';

export const useSimplifiedTutorScheduler = () => {
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeEventTab, setActiveEventTab] = useState('details');
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [newEvent, setNewEvent] = useState<Partial<ClassEvent>>({});
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch scheduled classes
  const { data: classData, refetch } = useQuery({
    queryKey: ['scheduled-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select(`
          *,
          student:profiles!scheduled_classes_student_id_fkey(first_name, last_name, email),
          tutor:profiles!scheduled_classes_tutor_id_fkey(first_name, last_name, email)
        `)
        .eq('tutor_id', user.id)
        .neq('status', 'completed')
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((record: any) => {
        const student = record.student || {};
        const tutor = record.tutor || {};
        
        const studentName = 
          student.first_name || student.last_name
            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
            : student.email || 'Unknown Student';
            
        const tutorName =
          tutor.first_name || tutor.last_name
            ? `${tutor.first_name || ''} ${tutor.last_name || ''}`.trim()
            : tutor.email || 'Unknown Tutor';
        
        return {
          id: record.id,
          title: record.title,
          date: record.date,
          startTime: record.start_time?.substring(0, 5) || '00:00',
          endTime: record.end_time?.substring(0, 5) || '00:00',
          subject: record.subject || '',
          studentId: record.student_id,
          studentName,
          tutorId: record.tutor_id,
          tutorName,
          zoomLink: record.zoom_link,
          notes: record.notes,
          status: record.status,
          attendance: record.attendance,
          materialsUrl: record.materials_url || [],
          relationshipId: record.relationship_id,
        } as ClassEvent;
      });
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscriptions
  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
    setClasses: setScheduledClasses,
  });

  useEffect(() => {
    if (classData) {
      setScheduledClasses(classData);
    }
  }, [classData]);

  const handleSelectEvent = useCallback((event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
  }, []);

  const handleCreateEvent = useCallback(() => {
    setIsAddEventOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: ClassEvent) => {
    setSelectedEvent(event);
    setIsEditEventOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(async (eventId: string, isRecurring?: boolean): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('scheduled_classes')
        .delete()
        .eq('id', eventId)
        .eq('tutor_id', user.id);
      
      if (error) throw error;
      
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['scheduled-classes', user.id] }),
      ]);
      
      toast.success(isRecurring ? 'All recurring classes deleted' : 'Class deleted successfully');
      return true;
    } catch (error) {
      log.error('Error deleting event:', error);
      throw error;
    }
  }, [user?.id, refetch, queryClient]);

  const closeAllDialogs = useCallback(() => {
    setIsViewEventOpen(false);
    setIsAddEventOpen(false);
    setIsEditEventOpen(false);
    setSelectedEvent(null);
  }, []);

  const refreshData = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['scheduled-classes'] });
  }, [refetch, queryClient]);

  const handleCreateEventActual = useCallback(async (event: ClassEvent): Promise<boolean> => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return false;
    }

    try {
      const baseClassData = {
        title: event.title,
        tutor_id: user.id,
        student_id: event.studentId,
        start_time: event.startTime,
        end_time: event.endTime,
        subject: event.subject,
        zoom_link: event.zoomLink,
        notes: event.notes,
        relationship_id: event.relationshipId,
      };

      let success = false;

      if (event.recurring && event.recurringUntil && event.date) {
        const startDate = startOfDay(event.date as Date);
        const endDate = event.recurringUntil as Date;
        const dates: string[] = [];
        for (let i = 0; i < 12; i++) {
          const d = addWeeks(startDate, i);
          if (isAfter(d, endDate)) break;
          dates.push(formatClassEventDate(d));
        }

        const count = await createScheduledClassBatch(baseClassData, dates);
        if (count > 0) {
          const dayName = format(startDate, 'EEEE');
          toast.success(`${count} class${count !== 1 ? 'es' : ''} scheduled (${dayName}s, ${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')})`);
          success = true;
        }
      } else {
        const classData = {
          ...baseClassData,
          date: event.date ? formatClassEventDate(event.date) : '',
        };
        const classId = await createScheduledClass(classData);
        if (classId) {
          toast.success('Class scheduled successfully');
          success = true;
        }
      }

      if (success) {
        await Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: ['scheduled-classes', user.id] }),
        ]);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Error creating event:', error);
      toast.error('Failed to create class');
      return false;
    }
  }, [user?.id, refetch, queryClient]);

  const resetNewEventForm = useCallback(() => {}, []);
  const handleMarkMessageRead = useCallback(async () => {}, []);
  const handleDownloadFile = useCallback(async () => {}, []);
  const getUnreadMessageCount = useCallback(() => 0, []);
  const refreshEvent = useCallback(async () => {}, []);
  const mockAsyncFunction = useCallback(async () => true, []);

  // Fetch real tutor profile
  const { data: currentUser } = useQuery({
    queryKey: ['tutor-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, zoom_link')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return useMemo(() => ({
    scheduledClasses,
    selectedEvent,
    isViewEventOpen,
    isAddEventOpen,
    isEditEventOpen,
    selectedDate,
    setSelectedDate,
    setIsAddEventOpen,
    setIsViewEventOpen,
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
    newEvent,
    setNewEvent,
    
    filteredClasses: scheduledClasses,
    allSubjects: [] as string[],
    studentMessages: [] as any[],
    studentUploads: [] as any[],
    isLoading: false,
    refetchClasses: refreshData,
    currentUser,
    
    handleSelectEvent,
    handleCreateEvent: handleCreateEventActual,
    handleEditEvent: mockAsyncFunction,
    handleDeleteEvent,
    handleDuplicateEvent: resetNewEventForm,
    resetNewEventForm,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
    refreshEvent,
    closeAllDialogs,
    refreshData,
  }), [
    scheduledClasses, selectedEvent, isViewEventOpen, isAddEventOpen, isEditEventOpen,
    selectedDate, activeEventTab, isEditMode, searchTerm, subjectFilter, studentFilter,
    newEvent, currentUser, refreshData, handleSelectEvent, handleCreateEventActual,
    mockAsyncFunction, handleDeleteEvent, resetNewEventForm, handleMarkMessageRead,
    handleDownloadFile, getUnreadMessageCount, refreshEvent, closeAllDialogs,
  ]);
};
