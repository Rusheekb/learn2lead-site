import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClassSession } from '@/types/classTypes';
import { useAuth } from '@/contexts/AuthContext';
import CalendarWithEvents from '@/components/CalendarWithEvents';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { fetchScheduledClasses } from '@/services/class/fetch';
import { ClassEvent } from '@/types/tutorTypes';
import StudentClassDetailsDialog from './StudentClassDetailsDialog';

interface ClassCalendarContainerProps {
  studentId?: string | null;
  onSelectClass?: (classSession: ClassSession) => void;
}

export const ClassCalendarContainer: React.FC<ClassCalendarContainerProps> = ({ studentId, onSelectClass }) => {
  const [sessions, setSessions] = useState<ClassEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const mapEventToSession = (event: ClassEvent): ClassSession => ({
    id: event.id,
    title: event.title,
    subjectId: (event.subject as unknown as string) || '',
    tutorName: event.tutorName || '',
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    zoomLink: event.zoomLink || '',
    recurring: Boolean(event.recurring),
    recurringDays: event.recurringDays,
  });

  const handleClassSelect = (event: ClassEvent) => {
    const session = mapEventToSession(event);
    setSelectedClass(session);
    setIsDialogOpen(true);
    onSelectClass?.(session);
  };

  if (isLoading) {
    return <div>Loading calendar...</div>;
  }

  return (
    <>
      <CalendarWithEvents 
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        scheduledClasses={sessions}
        onSelectEvent={handleClassSelect}
        onAddEventClick={() => {}}
        getUnreadMessageCount={() => 0}
      />
      <StudentClassDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        classSession={selectedClass}
      />
    </>
  );
};