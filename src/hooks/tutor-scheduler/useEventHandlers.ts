
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClassEvent } from '@/types/tutorTypes';
import {
  createScheduledClass,
  updateScheduledClass,
  deleteScheduledClass,
} from '@/services/classService';

export const useEventHandlers = (
  scheduledClasses: ClassEvent[],
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>,
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<string>('details');

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    setActiveEventTab('details');
    setIsEditMode(false);
  };

  const handleCreateEvent = async (newEvent: any) => {
    try {
      if (!newEvent.title || !newEvent.studentId || !newEvent.subject) {
        toast.error('Please fill in all required fields');
        return false;
      }

      const scheduledClass = {
        title: newEvent.title,
        tutor_id: newEvent.tutorId,
        student_id: newEvent.studentId,
        date: format(newEvent.date, 'yyyy-MM-dd'),
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        subject: newEvent.subject,
        zoom_link: newEvent.zoomLink || null,
        notes: newEvent.notes || null,
      };

      const newClassId = await createScheduledClass(scheduledClass);

      if (newClassId) {
        const createdClass: ClassEvent = {
          id: newClassId,
          title: newEvent.title,
          tutorId: newEvent.tutorId,
          tutorName: 'Current Tutor', // Will be updated by realtime events
          studentId: newEvent.studentId,
          studentName: 'Student', // Will be updated by realtime events
          date: newEvent.date,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          subject: newEvent.subject,
          zoomLink: newEvent.zoomLink || null,
          notes: newEvent.notes || null,
        };

        setScheduledClasses([...scheduledClasses, createdClass]);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating class event:', error);
      toast.error('Failed to create new class');
      return false;
    }
  };

  const handleEditEvent = async () => {
    try {
      if (!selectedEvent) return false;

      const scheduledClass = {
        title: selectedEvent.title,
        date:
          typeof selectedEvent.date === 'string'
            ? selectedEvent.date
            : format(selectedEvent.date, 'yyyy-MM-dd'),
        start_time: selectedEvent.startTime,
        end_time: selectedEvent.endTime,
        subject: selectedEvent.subject,
        zoom_link: selectedEvent.zoomLink,
        notes: selectedEvent.notes,
      };

      const success = await updateScheduledClass(
        selectedEvent.id,
        scheduledClass
      );

      if (success) {
        setScheduledClasses(
          scheduledClasses.map((event) =>
            event.id === selectedEvent.id ? selectedEvent : event
          )
        );
        setIsEditMode(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating class event:', error);
      toast.error('Failed to update class');
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const success = await deleteScheduledClass(eventId);

      if (success) {
        setScheduledClasses(
          scheduledClasses.filter((event) => event.id !== eventId)
        );
        setIsViewEventOpen(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting class event:', error);
      toast.error('Failed to delete class');
      return false;
    }
  };

  const handleDuplicateEvent = (event: ClassEvent) => {
    try {
      const duplicatedEvent = {
        ...event,
        title: `Copy of ${event.title}`,
        id: '', // Will be assigned by the backend
      };

      setSelectedEvent(null);
      setIsViewEventOpen(false);

      // Remove ID and use create function
      const { id, ...newEvent } = duplicatedEvent;

      // Create a newEvent object compatible with our form
      const formattedEvent = {
        title: newEvent.title,
        date: new Date(
          typeof newEvent.date === 'string' ? newEvent.date : newEvent.date
        ),
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        studentId: newEvent.studentId || '',
        subject: newEvent.subject,
        zoomLink: newEvent.zoomLink || '',
        notes: newEvent.notes || '',
        tutorId: newEvent.tutorId || '',
      };

      // Use createEvent to create a new class from the duplicate
      handleCreateEvent(formattedEvent);

      return true;
    } catch (error) {
      console.error('Error duplicating class event:', error);
      toast.error('Failed to duplicate class');
      return false;
    }
  };

  return {
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
  };
};

export default useEventHandlers;
