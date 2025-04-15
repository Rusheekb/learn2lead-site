
import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { ClassEvent } from '@/types/tutorTypes';
import EmptyDayPanel from './EmptyDayPanel';
import ClassEventCard from './ClassEventCard';
import { format, isSameDay } from 'date-fns';

interface CalendarWithEventsProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  scheduledClasses: ClassEvent[];
  onSelectEvent: (event: ClassEvent) => void;
  onAddEventClick: () => void;
  getUnreadMessageCount: (classId: string) => number;
}

const CalendarWithEvents: React.FC<CalendarWithEventsProps> = ({
  selectedDate,
  setSelectedDate,
  scheduledClasses,
  onSelectEvent,
  onAddEventClick,
  getUnreadMessageCount
}) => {
  // Find events for the selected date
  const eventsForSelectedDate = scheduledClasses.filter(cls => {
    const eventDate = typeof cls.date === 'string' ? new Date(cls.date) : cls.date;
    return isSameDay(eventDate, selectedDate);
  });

  // Sort events by start time
  const sortedEvents = [...eventsForSelectedDate].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <Card className="p-4 flex-shrink-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          className="rounded-md"
        />
      </Card>
      
      <Card className="flex-grow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>
          <Button onClick={onAddEventClick} size="sm" className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>Add Class</span>
          </Button>
        </div>
        
        <div className="space-y-3">
          {sortedEvents.length > 0 ? (
            sortedEvents.map((event) => (
              <ClassEventCard
                key={event.id}
                event={event}
                onClick={() => onSelectEvent(event)}
                unreadMessageCount={getUnreadMessageCount(event.id)}
              />
            ))
          ) : (
            <EmptyDayPanel onAddClick={onAddEventClick} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default CalendarWithEvents;
