
import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ClassSession } from '@/types/classTypes';

interface ClassCalendarColumnsProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  sessions: ClassSession[];
}

const ClassCalendarColumns: React.FC<ClassCalendarColumnsProps> = ({
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

      // Check if it's the exact date
      if (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      ) {
        return true;
      }

      // Check if it's a recurring session and if today is one of the recurring days
      if (session.recurring && session.recurringDays) {
        const dayOfWeek = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ][date.getDay()];
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

export default ClassCalendarColumns;
