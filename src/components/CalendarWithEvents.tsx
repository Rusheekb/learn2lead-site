
import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, parseISO } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { startOfDay, addDays } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import CompletedClassActions from '@/components/tutor/CompletedClassActions';
import { useAuth } from '@/contexts/AuthContext';
import { parseDateToLocal } from '@/utils/safeDateUtils';

interface CalendarWithEventsProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  scheduledClasses: ClassEvent[];
  onSelectEvent: (event: ClassEvent) => void;
  onAddEventClick: () => void;
  getUnreadMessageCount: (classId: string) => number;
}

// Helper function to get upcoming events for the next 7 days
export const getUpcomingEvents = (events: ClassEvent[]): ClassEvent[] => {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);

  return events.filter((event) => {
    const eventDate = parseDateToLocal(event.date);
    const eventDay = startOfDay(eventDate);
    return eventDay >= today && eventDay <= nextWeek;
  });
};

const CalendarWithEvents: React.FC<CalendarWithEventsProps> = ({
  selectedDate,
  setSelectedDate,
  scheduledClasses,
  onSelectEvent,
  onAddEventClick,
  getUnreadMessageCount,
}) => {
  const { userRole } = useAuth();
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<ClassEvent[]>([]);

  const handleClassUpdate = () => {
    // Minimal update handler - let parent components handle the heavy lifting
    onSelectEvent(eventsForSelectedDate[0]); // Refresh the parent state
  };

  // Function to check if a date has any scheduled classes
  const hasScheduledOnDate = (date: Date) => {
    return scheduledClasses.some((event) => {
      const eventDate = parseDateToLocal(event.date);
      return isSameDay(date, eventDate) && event.status !== 'completed';
    });
  };

  const hasCompletedOnDate = (date: Date) => {
    return scheduledClasses.some((event) => {
      const eventDate = parseDateToLocal(event.date);
      return isSameDay(date, eventDate) && event.status === 'completed';
    });
  };

  useEffect(() => {
    // Find events for the selected date
    const events = scheduledClasses.filter((event) => {
      // Handle both Date objects and string dates
      const eventDate = parseDateToLocal(event.date);
      const result = isSameDay(selectedDate, eventDate);
      
      return result;
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
              hasScheduled: (date) => hasScheduledOnDate(date),
              hasCompleted: (date) => hasCompletedOnDate(date),
            }}
            modifiersClassNames={{
              hasScheduled:
                'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:bg-green-500 after:rounded-full',
              hasCompleted:
                'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:bg-gray-400 after:rounded-full',
            }}
            components={{
              DayContent: ({ date, ...props }) => (
                <div {...props}>
                  {date.getDate()}
                  {hasScheduledOnDate(date) && (
                    <span className="sr-only"> (has scheduled classes)</span>
                  )}
                  {hasCompletedOnDate(date) && (
                    <span className="sr-only"> (has completed classes)</span>
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
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg space-y-4">
              <p className="text-muted-foreground">No classes scheduled for this day</p>
              {userRole === 'tutor' && (
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  onClick={onAddEventClick}
                >
                  Add Class
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {eventsForSelectedDate.map((event) => (
                <div 
                  key={event.id}
                   className={`p-4 border rounded-lg transition-colors ${event.status === 'completed' ? 'bg-green-50 border-green-200' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectEvent(event)}
                    >
                      <h3 className="font-medium flex items-center gap-1.5">
                        {event.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{event.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.startTime} - {event.endTime} • {event.studentName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getUnreadMessageCount(event.id) > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                          {getUnreadMessageCount(event.id)}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        event.status === 'completed' ? 'bg-green-100 text-green-800' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.status}
                      </span>
                      {userRole === 'tutor' && (
                        <CompletedClassActions 
                          classEvent={event} 
                          onUpdate={handleClassUpdate}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarWithEvents;
