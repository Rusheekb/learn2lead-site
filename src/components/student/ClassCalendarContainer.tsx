import React, { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClassSession } from '@/types/classTypes';
import { useAuth } from '@/contexts/AuthContext';
import CalendarWithEvents from '@/components/CalendarWithEvents';
import { fetchScheduledClasses } from '@/services/class/fetch';
import { ClassEvent } from '@/types/tutorTypes';
import StudentClassDetailsDialog from './StudentClassDetailsDialog';
import { CalendarSkeleton } from '@/components/shared/skeletons';

interface ClassCalendarContainerProps {
  studentId?: string | null;
  onSelectClass?: (classSession: ClassSession) => void;
}

export const ClassCalendarContainer: React.FC<ClassCalendarContainerProps> = memo(({ studentId, onSelectClass }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  useRealtimeManager({
    userId: user?.id,
    userRole: user?.user_metadata?.role,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['student-classes', user?.id],
    queryFn: () => fetchScheduledClasses(undefined, user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

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
    return <CalendarSkeleton />;
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
});

ClassCalendarContainer.displayName = 'ClassCalendarContainer';
