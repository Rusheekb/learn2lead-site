
import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, parseISO } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import ClassEventCard from './ClassEventCard';
import EmptyDayPanel from './EmptyDayPanel';

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
  getUnreadMessageCount,
}) => {
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<
    ClassEvent[]
  >([]);

  // Function to check if a date has any scheduled classes
  const hasEventsOnDate = (date: Date) => {
    return scheduledClasses.some((event) => {
      const eventDate = event.date instanceof Date
        ? event.date
        : parseISO(event.date as string);
      return isSameDay(date, eventDate);
    });
  };

  useEffect(() => {
    // Find events for the selected date
    const events = scheduledClasses.filter((event) => {
      // Handle both Date objects and string dates
      const eventDate =
        event.date instanceof Date
          ? event.date
          : parseISO(event.date as string);

      return isSameDay(selectedDate, eventDate);
    });

    setEventsForSelectedDate(events);
  }, [selectedDate, scheduledClasses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="border rounded-md p-2 bg-white"
            modifiers={{
              hasEvent: (date) => hasEventsOnDate(date),
            }}
            modifiersClassNames={{
              hasEvent:
                'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-tutoring-teal after:rounded-full',
            }}
            components={{
              DayContent: ({ date, ...props }) => (
                <div {...props}>
                  {date.getDate()}
                  {hasEventsOnDate(date) && (
                    <span className="sr-only"> (has events)</span>
                  )}
                </div>
              ),
            }}
          />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsForSelectedDate.length === 0 ? (
            <EmptyDayPanel
              selectedDate={selectedDate}
              onAddClick={onAddEventClick}
            />
          ) : (
            <div className="space-y-4">
              {eventsForSelectedDate.map((event) => (
                <ClassEventCard
                  key={event.id}
                  event={event}
                  onClick={() => onSelectEvent(event)}
                  unreadMessageCount={getUnreadMessageCount(event.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarWithEvents;
