import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import DailyClassSessions from './DailyClassSessions';
import UpcomingClassSessions from './UpcomingClassSessions';
import StudentClassDetailsDialog from './StudentClassDetailsDialog';
import { ClassSession } from '@/types/classTypes';

interface ClassCalendarWithDialogProps {
  studentId: string | null;
  sessions: ClassSession[];
}

const ClassCalendarWithDialog: React.FC<ClassCalendarWithDialogProps> = ({
  studentId,
  sessions,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const handleOpenClassDetails = (event: CustomEvent<ClassSession>) => {
      setSelectedClass(event.detail);
      setIsDialogOpen(true);
    };

    window.addEventListener('openClassDetails', handleOpenClassDetails as EventListener);

    return () => {
      window.removeEventListener('openClassDetails', handleOpenClassDetails as EventListener);
    };
  }, []);

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

  const getDatesWithSessions = () => {
    const dates = sessions.map((session) => {
      const sessionDate =
        session.date instanceof Date ? session.date : new Date(session.date);
      return sessionDate;
    });
    return dates;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-1">
        <div className="p-4 border rounded-lg bg-card">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="w-full"
            modifiers={{
              hasSession: getDatesWithSessions(),
            }}
            modifiersStyles={{
              hasSession: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '50%',
              },
            }}
          />
        </div>
      </div>

      {/* Class Sessions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Daily Sessions */}
        <div className="p-4 border rounded-lg bg-card">
          <DailyClassSessions
            selectedDate={selectedDate}
            sessions={sessions}
          />
        </div>

        {/* Upcoming Sessions */}
        <div className="p-4 border rounded-lg bg-card">
          <UpcomingClassSessions sessions={sessions} />
        </div>
      </div>

      {/* Student Class Details Dialog */}
      <StudentClassDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        classSession={selectedClass}
      />
    </div>
  );
};

export default ClassCalendarWithDialog;