
import React from 'react';
import { isBefore, isToday, addDays, startOfDay } from 'date-fns';
import UpcomingSessionCard from './UpcomingSessionCard';
import EmptySessionsState from './EmptySessionsState';
import { ClassSession } from '@/types/classTypes';

interface UpcomingClassSessionsProps {
  sessions: ClassSession[];
  daysToShow?: number;
}

const UpcomingClassSessions: React.FC<UpcomingClassSessionsProps> = ({ 
  sessions, 
  daysToShow = 7 
}) => {
  const getUpcomingSessions = (days = daysToShow) => {
    const today = startOfDay(new Date());
    const futureDate = addDays(today, days);

    return sessions
      .filter((session) => {
        const sessionDate =
          session.date instanceof Date
            ? startOfDay(session.date)
            : startOfDay(new Date(session.date));

        return (
          (isToday(sessionDate) || isBefore(today, sessionDate)) &&
          isBefore(sessionDate, futureDate)
        );
      })
      .sort((a, b) => {
        const dateA =
          a.date instanceof Date
            ? a.date.getTime()
            : new Date(a.date).getTime();
        const dateB =
          b.date instanceof Date
            ? b.date.getTime()
            : new Date(b.date).getTime();
        return dateA - dateB;
      });
  };

  const upcomingSessions = getUpcomingSessions();

  return (
    <>
      <h4 className="text-lg font-medium mb-3">Upcoming Classes</h4>

      {upcomingSessions.length > 0 ? (
        <div className="space-y-3 max-h-[320px] overflow-y-auto">
          {upcomingSessions.map((session) => (
            <UpcomingSessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <EmptySessionsState message="No upcoming classes scheduled" />
      )}
    </>
  );
};

export default UpcomingClassSessions;
