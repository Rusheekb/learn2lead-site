import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format, isBefore, isToday, addDays, startOfDay } from 'date-fns';
import ClassCalendarColumn from './student/ClassCalendarColumn';
import ClassSessionDetail from './student/ClassSessionDetail';
import UpcomingSessionCard from './student/UpcomingSessionCard';
import EmptySessionsState from './student/EmptySessionsState';
import { ClassSession } from '@/types/classTypes';
import { fetchScheduledClasses } from '@/services/classService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ClassCalendarProps {
  studentId: string | null;
}

const ClassCalendar: React.FC<ClassCalendarProps> = ({ studentId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  useEffect(() => {
    if (!studentId) return;

    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const classEvents = await fetchScheduledClasses(undefined, studentId);

        const classSessions = classEvents.map((cls) => ({
          id: cls.id,
          title: cls.title,
          subjectId: cls.subject,
          tutorName: cls.tutorName || '',
          date: cls.date,
          startTime: cls.startTime,
          endTime: cls.endTime,
          zoomLink: cls.zoomLink || '',
          recurring: false,
          recurringDays: [],
        }));

        setSessions(classSessions);
      } catch (error) {
        console.error('Error loading sessions:', error);
        toast.error('Failed to load class sessions');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel('student-classes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_classes',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          fetchScheduledClasses(undefined, studentId)
            .then((classEvents) => {
              const classSessions = classEvents.map((cls) => ({
                id: cls.id,
                title: cls.title,
                subjectId: cls.subject,
                tutorName: cls.tutorName || '',
                date: cls.date,
                startTime: cls.startTime,
                endTime: cls.endTime,
                zoomLink: cls.zoomLink || '',
                recurring: false,
                recurringDays: [],
              }));

              setSessions(classSessions);
            })
            .catch((error) => {
              console.error('Error updating sessions:', error);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  const getSessionsForDate = (date: Date) => {
    return sessions.filter((session) => {
      const sessionDate =
        session.date instanceof Date ? session.date : new Date(session.date);

      return (
        sessionDate.getDate() === date.getDate() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getUpcomingSessions = (daysToShow = 7) => {
    const today = startOfDay(new Date());
    const futureDate = addDays(today, daysToShow);

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

  const sessionsForSelectedDate = getSessionsForDate(selectedDate);
  const upcomingSessions = getUpcomingSessions();

  if (isLoading) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-medium mb-4">Class Calendar</h3>
        <Card>
          <CardContent className="p-6 flex justify-center items-center h-64">
            <p>Loading your classes...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-medium mb-4">Class Calendar</h3>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <ClassCalendarColumn
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                sessions={sessions}
              />
            </div>

            <div>
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
            </div>

            <div>
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassCalendar;
