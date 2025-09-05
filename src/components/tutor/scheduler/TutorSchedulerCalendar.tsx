
import React from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import CalendarWithEvents from '@/components/CalendarWithEvents';

interface TutorSchedulerCalendarProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  scheduledClasses: ClassEvent[];
  onSelectEvent: (event: ClassEvent) => void;
  onAddEventClick: () => void;
  getUnreadMessageCount: (classId: string) => number;
}

const TutorSchedulerCalendar: React.FC<TutorSchedulerCalendarProps> = ({
  selectedDate,
  setSelectedDate,
  scheduledClasses,
  onSelectEvent,
  onAddEventClick,
  getUnreadMessageCount,
}) => {
  console.log('TutorSchedulerCalendar rendering with', scheduledClasses.length, 'events');
  
  return (
    <CalendarWithEvents
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      scheduledClasses={scheduledClasses}
      onSelectEvent={onSelectEvent}
      onAddEventClick={onAddEventClick}
      getUnreadMessageCount={getUnreadMessageCount}
    />
  );
};

export default TutorSchedulerCalendar;
