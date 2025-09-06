
import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, parseISO } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import ClassEventCard from './ClassEventCard';
import EmptyDayPanel from './EmptyDayPanel';
import { supabase } from '@/integrations/supabase/client';
import { transformDbRecordToClassEvent } from '@/services/class-operations/utils/classEventMapper';

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
  const [completedClasses, setCompletedClasses] = useState<ClassEvent[]>([]);

  // Function to check if a date has any scheduled or completed classes
  const hasEventsOnDate = (date: Date) => {
    const hasScheduled = scheduledClasses.some((event) => {
      const eventDate = event.date instanceof Date
        ? event.date
        : parseISO(event.date as string);
      return isSameDay(date, eventDate);
    });
    
    const hasCompleted = completedClasses.some((event) => {
      const eventDate = event.date instanceof Date
        ? event.date
        : parseISO(event.date as string);
      return isSameDay(date, eventDate);
    });
    
    return hasScheduled || hasCompleted;
  };

  // Fetch completed classes
  useEffect(() => {
    const fetchCompletedClasses = async () => {
      try {
        const { data, error } = await supabase.from('class_logs').select('*');
        if (!error && data) {
          const transformedClasses = data.map(item => transformDbRecordToClassEvent(item as any));
          setCompletedClasses(transformedClasses);
        }
      } catch (error) {
        console.error('Error fetching completed classes:', error);
      }
    };

    fetchCompletedClasses();
  }, []);

  useEffect(() => {
    // Find scheduled events for the selected date
    const scheduledEvents = scheduledClasses.filter((event) => {
      const eventDate =
        event.date instanceof Date
          ? event.date
          : parseISO(event.date as string);

      return isSameDay(selectedDate, eventDate);
    });

    // Find completed events for the selected date
    const completedEvents = completedClasses.filter((event) => {
      const eventDate =
        event.date instanceof Date
          ? event.date
          : parseISO(event.date as string);

      return isSameDay(selectedDate, eventDate);
    });

    // Combine both lists, with completed classes marked as such
    const allEvents = [
      ...scheduledEvents,
      ...completedEvents.map(event => ({ ...event, status: 'completed' as const }))
    ];

    setEventsForSelectedDate(allEvents);
  }, [selectedDate, scheduledClasses, completedClasses]);

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
