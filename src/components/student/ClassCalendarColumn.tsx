
import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { ClassSession } from '@/types/classTypes';
import { Badge } from '@/components/ui/badge';

interface ClassCalendarColumnProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  sessions: ClassSession[];
}

const ClassCalendarColumn: React.FC<ClassCalendarColumnProps> = ({
  selectedDate,
  setSelectedDate,
  sessions,
}) => {
  // Function to check if a date has sessions
  const hasSessionsOnDate = (date: Date) => {
    return getSessionsForDate(date, sessions).length > 0;
  };

  // Function to get sessions for a specific date
  const getSessionsForDate = (date: Date, sessions: ClassSession[]) => {
    return sessions.filter((session) => {
      const sessionDate =
        session.date instanceof Date ? session.date : new Date(session.date);

      return isSameDay(sessionDate, date);
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
          hasSession:
            'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-tutoring-teal after:rounded-full',
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
