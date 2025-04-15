
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface ClassSession {
  id: string;
  title: string;
  subjectId: number | string;
  tutorName: string;
  date: Date;
  startTime: string;
  endTime: string;
  zoomLink: string;
  recurring: boolean;
  recurringDays?: string[];
}

interface ClassCalendarColumnProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  sessions: ClassSession[];
}

const ClassCalendarColumn: React.FC<ClassCalendarColumnProps> = ({ 
  selectedDate, 
  setSelectedDate, 
  sessions 
}) => {
  // Function to check if a date has sessions
  const hasSessionsOnDate = (date: Date) => {
    return getSessionsForDate(date, sessions).length > 0;
  };

  // Function to get sessions for a specific date
  const getSessionsForDate = (date: Date, sessions: ClassSession[]) => {
    return sessions.filter(session => {
      // Check if it's the exact date
      if (session.date.getDate() === date.getDate() && 
          session.date.getMonth() === date.getMonth() && 
          session.date.getFullYear() === date.getFullYear()) {
        return true;
      }
      
      // Check if it's a recurring session and if today is one of the recurring days
      if (session.recurring && session.recurringDays) {
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
        return session.recurringDays.includes(dayOfWeek);
      }
      
      return false;
    });
  };

  return (
    <div>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && setSelectedDate(date)}
        className="rounded border p-3"
        modifiers={{
          hasSession: (date) => hasSessionsOnDate(date),
        }}
        modifiersClassNames={{
          hasSession: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-tutoring-teal after:rounded-full"
        }}
        components={{
          DayContent: ({ date, ...props }) => (
            <div {...props}>
              {date.getDate()}
              {hasSessionsOnDate(date) && (
                <span className="sr-only"> (has sessions)</span>
              )}
            </div>
          ),
        }}
      />
    </div>
  );
};

export default ClassCalendarColumn;
