import { useState, useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';

export const useSimplifiedTutorScheduler = () => {
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch scheduled classes
  const { data: classData, refetch } = useQuery({
    queryKey: ['scheduled-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select('*')
        .eq('tutor_id', user.id)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as any;
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

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_classes')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
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

  return {
    scheduledClasses,
    selectedEvent,
    isViewEventOpen,
    isAddEventOpen,
    isEditEventOpen,
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    closeAllDialogs,
    refreshData,
  };
};