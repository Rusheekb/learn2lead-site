import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClassSession } from '@/types/classTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CalendarWithEvents from '@/components/CalendarWithEvents';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';

interface ClassCalendarContainerProps {
  studentId?: string | null;
  onSelectClass?: (classSession: ClassSession) => void;
}

export const ClassCalendarContainer: React.FC<ClassCalendarContainerProps> = ({ studentId, onSelectClass }) => {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const { user } = useAuth();

  // Use simplified realtime manager
  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
  });

  // Fetch student classes
  const { data: classData, isLoading } = useQuery({
    queryKey: ['student-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_classes')
        .select('*')
        .eq('student_id', user.id)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  React.useEffect(() => {
    if (classData) {
      setSessions(classData);
    }
  }, [classData]);

  const handleClassSelect = (session: ClassSession) => {
    onSelectClass?.(session);
  };

  if (isLoading) {
    return <div>Loading calendar...</div>;
  }

  return (
    <CalendarWithEvents 
      selectedDate={new Date()}
      setSelectedDate={() => {}}
      scheduledClasses={sessions as any}
      onSelectEvent={handleClassSelect as any}
      onAddEventClick={() => {}}
      getUnreadMessageCount={() => 0}
    />
  );
};