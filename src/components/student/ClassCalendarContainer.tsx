import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClassSession } from '@/types/classTypes';
import { useAuth } from '@/contexts/AuthContext';
import CalendarWithEvents from '@/components/CalendarWithEvents';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { fetchScheduledClasses } from '@/services/class/fetch';
import { ClassEvent } from '@/types/tutorTypes';

interface ClassCalendarContainerProps {
  studentId?: string | null;
  onSelectClass?: (classSession: ClassSession) => void;
}

export const ClassCalendarContainer: React.FC<ClassCalendarContainerProps> = ({ studentId, onSelectClass }) => {
  const [sessions, setSessions] = useState<ClassEvent[]>([]);
  const { user } = useAuth();

  // Use simplified realtime manager
  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
  });

  // Fetch student classes with proper transformation
  const { data: classData, isLoading } = useQuery({
    queryKey: ['student-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await fetchScheduledClasses(undefined, user.id);
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