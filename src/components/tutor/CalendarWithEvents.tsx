
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { ClassEvent } from "@/types/tutorTypes";
import { hasEventsOnDate, getEventsForDate } from "@/utils/dateTimeUtils";
import ClassEventCard from "./ClassEventCard";

interface CalendarWithEventsProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  scheduledClasses: ClassEvent[];
  onSelectEvent: (event: ClassEvent) => void;
  onAddEventClick: () => void;
  getUnreadMessageCount: (classId: number) => number;
}

const CalendarWithEvents: React.FC<CalendarWithEventsProps> = ({ 
  selectedDate,
  setSelectedDate,
  scheduledClasses,
  onSelectEvent,
  onAddEventClick,
  getUnreadMessageCount
}) => {
  const eventsForSelectedDate = getEventsForDate(selectedDate, scheduledClasses);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      
      <Card>
        <CardHeader>
          <CardTitle>
            Classes for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsForSelectedDate.length > 0 ? (
            <div className="space-y-4">
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
    </div>
  );
};

export default CalendarWithEvents;
