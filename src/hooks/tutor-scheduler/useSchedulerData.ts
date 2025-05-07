
import { useState, useEffect, useCallback } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { format, addDays } from 'date-fns';
import { fetchScheduledClasses } from '@/services/classService';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

// This is just a placeholder for the structure - you'll need to implement the actual file
export default function useSchedulerData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<ClassEvent>>({
    tutorName: '',
    studentName: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    subject: '',
    title: '',
    zoomLink: '',
    notes: '',
    status: 'scheduled',
  });
  
  // Extract unique subjects from classes
  const allSubjects = Array.from(
    new Set(scheduledClasses.map((cls) => cls.subject || ''))
  ).filter(Boolean);

  const loadClasses = useCallback(async () => {
    if (!user || !user.id) return;
    
    setIsLoading(true);
    try {
      // Only fetch classes for the current logged-in tutor
      const classes = await fetchScheduledClasses(user.id);
      setScheduledClasses(classes);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh classes data whenever the component mounts or the user changes
  useEffect(() => {
    if (user?.id) {
      loadClasses();
      // Also invalidate any cached queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
    }
  }, [loadClasses, user?.id, queryClient]);

  const resetNewEventForm = () => {
    setNewEvent({
      tutorName: '',
      studentName: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      subject: '',
      title: '',
      zoomLink: '',
      notes: '',
      status: 'scheduled',
    });
  };

  return {
    selectedDate,
    setSelectedDate,
    isLoading,
    scheduledClasses,
    setScheduledClasses,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    newEvent,
    setNewEvent,
    allSubjects,
    resetNewEventForm,
  };
}
