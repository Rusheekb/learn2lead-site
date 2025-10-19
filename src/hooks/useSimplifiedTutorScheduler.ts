import { useState, useEffect, useMemo } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createScheduledClass } from '@/services/class/create';
import { formatClassEventDate, parseDateToLocal } from '@/utils/safeDateUtils';

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
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      // Transform raw DB data to ClassEvent format
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
          date: record.date, // Keep as string 'YYYY-MM-DD'
          startTime: record.start_time?.substring(0, 5) || '00:00', // Format as 'HH:mm'
          endTime: record.end_time?.substring(0, 5) || '00:00', // Format as 'HH:mm'
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

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
  };

  const handleCreateEvent = () => {
    setIsAddEventOpen(true);
  };

  const handleEditEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsEditEventOpen(true);
  };

  const handleDeleteEvent = async (eventId: string, isRecurring?: boolean): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('scheduled_classes')
        .delete()
        .eq('id', eventId)
        .eq('tutor_id', user.id); // Ensure only tutor can delete their classes
      
      if (error) throw error;
      
      // Refresh data
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['scheduled-classes', user.id] }),
        queryClient.refetchQueries({ queryKey: ['scheduled-classes', user.id] })
      ]);
      
      toast.success(isRecurring ? 'All recurring classes deleted' : 'Class deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const closeAllDialogs = () => {
    setIsViewEventOpen(false);
    setIsAddEventOpen(false);
    setIsEditEventOpen(false);
    setSelectedEvent(null);
  };

  const refreshData = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['scheduled-classes'] });
  };

  // Actual create event handler
  const handleCreateEventActual = async (event: ClassEvent): Promise<boolean> => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return false;
    }

    try {
      // Map ClassEvent to the format expected by createScheduledClass
      const classData = {
        title: event.title,
        tutor_id: user.id,
        student_id: event.studentId,
        date: event.date ? formatClassEventDate(event.date) : '', // Safe date formatting to prevent timezone issues
        start_time: event.startTime,
        end_time: event.endTime,
        subject: event.subject,
        zoom_link: event.zoomLink,
        notes: event.notes,
        relationship_id: event.relationshipId,
      };

      console.log('Creating class with data:', classData);
      
      const classId = await createScheduledClass(classData);
      
      if (classId) {
        // Refresh data after successful creation
        await Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: ['scheduled-classes', user.id] }),
          queryClient.refetchQueries({ queryKey: ['scheduled-classes', user.id] })
        ]);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create class');
      return false;
    }
  };

  // Mock additional functions needed by TutorScheduler
  const mockAsyncFunction = async () => true;
  const mockFunction = () => {};

  // Memoize currentUser to prevent unnecessary re-renders
  const currentUser = useMemo(() => ({ first_name: 'Current', last_name: 'Tutor' } as any), []);

  return {
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
    
    // Additional properties expected by TutorScheduler  
    filteredClasses: scheduledClasses,
    allSubjects: [],
    studentMessages: [],
    studentUploads: [],
    isLoading: false,
    refetchClasses: refreshData,
    currentUser,
    
    // Handlers
    handleSelectEvent,
    handleCreateEvent: handleCreateEventActual,
    handleEditEvent: mockAsyncFunction,
    handleDeleteEvent,
    handleDuplicateEvent: mockFunction,
    resetNewEventForm: mockFunction,
    handleMarkMessageRead: async () => {},
    handleDownloadFile: async () => {},
    getUnreadMessageCount: () => 0,
    refreshEvent: async () => {},
    closeAllDialogs,
    refreshData,
  };
};