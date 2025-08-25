
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useQueryClient } from '@tanstack/react-query';
import ClassCalendarColumn from './ClassCalendarColumn';
import DailyClassSessions from './DailyClassSessions';
import UpcomingClassSessions from './UpcomingClassSessions';
import StudentClassDetailsDialog from './StudentClassDetailsDialog';
import { ClassSession } from '@/types/classTypes';
import { fetchScheduledClasses } from '@/services/classService';
import { toast } from 'sonner';
import { useRealtimeClassUpdates } from '@/hooks/student/useRealtimeClassUpdates';

interface ClassCalendarContainerProps {
  studentId: string | null;
}

const ClassCalendarContainer: React.FC<ClassCalendarContainerProps> = ({ studentId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Listen for class detail events
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

  useEffect(() => {
    if (!studentId) return;

    const loadSessions = async () => {
      setIsLoading(true);
      try {
        console.log(`Fetching classes for student: ${studentId}`);
        const classEvents = await fetchScheduledClasses(undefined, studentId);
        console.log(`Received ${classEvents.length} classes for student`);

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
    
    // Invalidate and refetch on mount to ensure we have the latest data
    queryClient.invalidateQueries({ queryKey: ['studentClasses', studentId] });
    queryClient.invalidateQueries({ queryKey: ['upcomingClasses', studentId] });
    queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentId] });
  }, [studentId, queryClient]);

  // Use the reusable hook for realtime updates
  useRealtimeClassUpdates(studentId, setSessions, queryClient);

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
              <DailyClassSessions 
                selectedDate={selectedDate}
                sessions={sessions}
              />
            </div>

            <div>
              <UpcomingClassSessions sessions={sessions} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Class Details Dialog */}
      <StudentClassDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        classSession={selectedClass}
      />
    </div>
  );
};

export default ClassCalendarContainer;
