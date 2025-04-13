
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, User, Clock, Video } from "lucide-react";
import { ClassEvent } from "@/types/tutorTypes";
import { hasEventsOnDate, getEventsForDate } from "@/utils/dateTimeUtils";
import ClassEventCard from "./ClassEventCard";
import { format, addDays, isBefore, isToday, startOfDay } from "date-fns";

interface CalendarWithEventsProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  scheduledClasses: ClassEvent[];
  onSelectEvent: (event: ClassEvent) => void;
  onAddEventClick: () => void;
  getUnreadMessageCount: (classId: number) => number;
}

// Helper function to get upcoming events in the next few days
const getUpcomingEvents = (events: ClassEvent[], daysToShow = 7) => {
  const today = startOfDay(new Date());
  const futureDate = addDays(today, daysToShow);
  
  return events.filter(event => {
    const eventDate = startOfDay(event.date);
    return (isToday(eventDate) || isBefore(today, eventDate)) && 
           isBefore(eventDate, futureDate);
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
};

const CalendarWithEvents: React.FC<CalendarWithEventsProps> = ({ 
  selectedDate,
  setSelectedDate,
  scheduledClasses,
  onSelectEvent,
  onAddEventClick,
  getUnreadMessageCount
}) => {
  const eventsForSelectedDate = getEventsForDate(selectedDate, scheduledClasses);
  const upcomingEvents = getUpcomingEvents(scheduledClasses);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Column */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded border p-3"
            modifiers={{
              hasEvent: (date) => hasEventsOnDate(date, scheduledClasses),
            }}
            modifiersClassNames={{
              hasEvent: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-tutoring-teal after:rounded-full"
            }}
          />
        </CardContent>
      </Card>
      
      {/* Selected Date Events Column */}
      <Card>
        <CardHeader>
          <CardTitle>
            Classes on {format(selectedDate, 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsForSelectedDate.length > 0 ? (
            <div className="space-y-4 max-h-[320px] overflow-y-auto">
              {eventsForSelectedDate.map((event) => (
                <ClassEventCard 
                  key={event.id}
                  event={event}
                  onClick={onSelectEvent}
                  unreadMessagesCount={getUnreadMessageCount(event.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
              <CalendarIcon className="h-10 w-10 mb-2 text-gray-400" />
              <p>No classes scheduled for this date</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={onAddEventClick}
              >
                Schedule a Class
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upcoming Events Column */}
      <Card>
        <CardHeader>
          <CardTitle>
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-4 max-h-[320px] overflow-y-auto">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="p-3 border rounded-md hover:border-tutoring-teal cursor-pointer" onClick={() => onSelectEvent(event)}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{event.title}</h3>
                    {getUnreadMessageCount(event.id) > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        {getUnreadMessageCount(event.id)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <User className="h-4 w-4 mr-1" />
                    <span>{event.studentName}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>{format(event.date, 'EEE, MMM d')}</span>
                    <Clock className="h-4 w-4 ml-2 mr-1" />
                    <span>{event.startTime}</span>
                  </div>
                  
                  {event.zoomLink && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-tutoring-blue mt-2"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={event.zoomLink} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-1 inline" />
                        Join Class
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
              <CalendarIcon className="h-10 w-10 mb-2 text-gray-400" />
              <p>No upcoming classes</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={onAddEventClick}
              >
                Schedule a Class
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarWithEvents;
