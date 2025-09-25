import { useState, useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeManager } from './useRealtimeManager';
import { useAuth } from '@/contexts/AuthContext';

export const useSimplifiedClassLogs = () => {
  const [classes, setClasses] = useState<ClassEvent[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch class logs
  const { data: classData, refetch } = useQuery({
    queryKey: ['class-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any;
    },
  });

  // Set up realtime subscriptions
  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
    setClasses,
  });

  useEffect(() => {
    if (classData) {
      setClasses(classData);
    }
  }, [classData]);

  const handleSelectClass = (classEvent: ClassEvent) => {
    setSelectedClass(classEvent);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedClass(null);
  };

  const refreshData = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['class-logs'] });
  };

  return {
    classes,
    selectedClass,
    showDetails,
    handleSelectClass,
    handleCloseDetails,
    refreshData,
  };
};