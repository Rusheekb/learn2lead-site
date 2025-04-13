import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, User, Clock, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { ClassEvent } from "@/types/tutorTypes";
import { hasEventsOnDate, getEventsForDate } from "@/utils/dateTimeUtils";
import ClassEventCard from "./ClassEventCard";
import { format, addDays, isBefore, isToday, startOfDay, addMonths, subMonths } from "date-fns";

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

const EmptyState = ({ onAddEventClick }: { onAddEventClick: () => void }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
    <CalendarIcon className="h-16 w-16 mb-4 text-gray-400" />
    <h3 className="text-xl font-medium text-gray-900 mb-2">No upcoming classes</h3>
    <p className="text-gray-500 mb-6">You have no classes scheduled for the next 7 days</p>
    <Button 
      onClick={onAddEventClick}
      className="bg-tutoring-blue hover:bg-blue-700 text-white"
    >
      <Plus className="h-4 w-4 mr-2" />
      Schedule a Class
    </Button>
  </div>
);

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
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Column */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="rounded-md border p-3"
            modifiers={{
              hasEvent: (date) => hasEventsOnDate(date, scheduledClasses),
              today: (date) => isToday(date),
            }}
            modifiersClassNames={{
              hasEvent: "relative bg-tutoring-blue/10 text-tutoring-blue font-medium",
              today: "relative border border-tutoring-blue text-tutoring-blue font-medium",
            }}
            showOutsideDays={true}
            fixedWeeks={true}
            classNames={{
              day_today: "bg-white",
              day_selected: "bg-tutoring-blue text-white hover:bg-tutoring-blue hover:text-white focus:bg-tutoring-blue focus:text-white",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_outside: "text-gray-300",
              head_cell: "text-gray-500 font-normal",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-tutoring-blue/5",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              caption: "flex justify-center pt-1 relative items-center px-8",
              caption_label: "text-sm font-medium",
              table: "w-full border-collapse",
            }}
          />
        </CardContent>
      </Card>
      
      {/* Upcoming Events Column */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="p-3 border rounded-md hover:border-tutoring-teal cursor-pointer transition-colors"
                  onClick={() => onSelectEvent(event)}
                >
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
            <EmptyState onAddEventClick={onAddEventClick} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarWithEvents;
