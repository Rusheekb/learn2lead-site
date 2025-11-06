
import React from 'react';
import { format } from 'date-fns';
import ClassSessionDetail from './ClassSessionDetail';
import EmptySessionsState from './EmptySessionsState';
import { ClassSession } from '@/types/classTypes';
import { parseDateToLocal } from '@/utils/safeDateUtils';

interface DailyClassSessionsProps {
  selectedDate: Date;
  sessions: ClassSession[];
}

const DailyClassSessions: React.FC<DailyClassSessionsProps> = ({ selectedDate, sessions }) => {
const getSessionsForDate = (date: Date) => {
  return sessions.filter((session) => {
    const sessionDate = parseDateToLocal(session.date);

    return (
      sessionDate.getDate() === date.getDate() &&
      sessionDate.getMonth() === date.getMonth() &&
      sessionDate.getFullYear() === date.getFullYear()
    );
  });
};

  const sessionsForSelectedDate = getSessionsForDate(selectedDate);

  return (
    <>
      <h4 className="text-lg font-medium mb-3">
        Classes on {format(selectedDate, 'MMMM d, yyyy')}
      </h4>

      {sessionsForSelectedDate.length > 0 ? (
        <div className="space-y-3 max-h-[320px] overflow-y-auto">
          {sessionsForSelectedDate.map((session) => (
            <ClassSessionDetail key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <EmptySessionsState message="No classes scheduled for this date" />
      )}
    </>
  );
};

export default DailyClassSessions;
