
import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, parseISO } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { startOfDay, addDays } from 'date-fns';
import CompletedClassActions from '@/components/tutor/CompletedClassActions';
import { useAuth } from '@/contexts/AuthContext';

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
    // Handle both Date objects and string dates
    const eventDate = event.date instanceof Date 
      ? event.date 
      : new Date(event.date);
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
    // Trigger a refetch of the scheduled classes
    window.location.reload(); // Simple approach for now
  };

  // Function to check if a date has any scheduled classes
  const hasEventsOnDate = (date: Date) => {
    // Add debugging console log to check what's happening
    const hasEvents = scheduledClasses.some((event) => {
      // Handle both Date objects and string dates
      const eventDate = event.date instanceof Date
        ? event.date
        : new Date(event.date);
      
      const result = isSameDay(date, eventDate);
      return result;
    });
    
    // Debug logging for specific dates
    if (date.getDate() === new Date().getDate()) {
      console.log(`Checking today (${date.toISOString().split('T')[0]}): hasEvents=${hasEvents}`, 
        scheduledClasses.map(e => ({ 
          date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : new Date(e.date).toISOString().split('T')[0], 
          title: e.title 
        }))
      );
    }
    
    return hasEvents;
  };

  useEffect(() => {
    // Find events for the selected date
    const events = scheduledClasses.filter((event) => {
      // Handle both Date objects and string dates
      const eventDate = event.date instanceof Date
        ? event.date
        : new Date(event.date);
      
      const result = isSameDay(selectedDate, eventDate);
      
      // Debug log to understand why events might not be showing
      if (isSameDay(selectedDate, new Date())) {
        console.log(`Event ${event.title} date check:`, {
          eventDate: eventDate.toISOString().split('T')[0],
          selectedDate: selectedDate.toISOString().split('T')[0],
          isSameDay: result
        });
      }
      
      return result;
    });

    console.log(`Found ${events.length} events for date ${selectedDate.toISOString().split('T')[0]}`);
    console.log('Events for selected date:', events);
    setEventsForSelectedDate(events);
  }, [selectedDate, scheduledClasses]);

  // Log scheduled classes for debugging
  useEffect(() => {
    console.log("CalendarWithEvents - Scheduled classes:", scheduledClasses);
    
    // Add a test event if none are found (for debugging UI)
    if (!scheduledClasses || scheduledClasses.length === 0) {
      console.log("No scheduled classes available in CalendarWithEvents");
    }
  }, [scheduledClasses]);

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
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg space-y-4">
              <p className="text-gray-500">No classes scheduled for this day</p>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={onAddEventClick}
              >
                Add Class
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {eventsForSelectedDate.map((event) => (
                <div 
                  key={event.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectEvent(event)}
                    >
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-gray-600">{event.subject}</p>
                      <p className="text-sm text-gray-600">
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
