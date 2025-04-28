
import React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { mockStudents } from './mock-data-students';
import SchedulerHeader from './SchedulerHeader';
import SchedulerFilter from './SchedulerFilter';
import CalendarWithEvents from './CalendarWithEvents';
import ClassDialogs from './ClassDialogs';
import { useClassLogsQuery } from '@/hooks/queries/useClassLogsQuery';
import { ClassEvent } from '@/types/tutorTypes';

const TutorScheduler: React.FC = () => {
  // Use the refactored hooks for data fetching and realtime updates
  const {
    classes: classList,
    createClass,
    updateClass,
    deleteClass,
    allSubjects,
  } = useClassLogsQuery();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [activeEventTab, setActiveEventTab] = useState('details');
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [studentUploads, setStudentUploads] = useState<any[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  
  // Initialize a new event form state
  const [newEvent, setNewEvent] = useState<ClassEvent>({
    id: '',
    title: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    studentId: '',
    studentName: '',
    subject: '',
    zoomLink: '',
    notes: '',
    tutorId: '',
    tutorName: '',
  });
  
  // Apply filters
  const applyFilters = (classes: ClassEvent[]) => {
    return classes.filter((cls) => {
      const matchesSearch =
        !searchTerm ||
        cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subject.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSubject =
        subjectFilter === 'all' || cls.subject === subjectFilter;

      const matchesStudent =
        studentFilter === 'all' || cls.studentId === studentFilter;

      return matchesSearch && matchesSubject && matchesStudent;
    });
  };
  
  const filteredClasses = applyFilters(scheduledClasses || []);

  // Event handlers
  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    setIsEditMode(false);
    setActiveEventTab('details');
  };

  const handleCreateEvent = async (event: ClassEvent) => {
    try {
      // Fix the issue with toISOString by ensuring date is a Date object
      const dateObject = event.date instanceof Date
        ? event.date 
        : new Date(event.date);
      
      // Create a new class with properly formatted date
      const newClassEvent = {
        ...event,
        date: dateObject.toISOString().split('T')[0]
      };
      
      await createClass(newClassEvent);
      return true;
    } catch (error) {
      console.error('Error creating event:', error);
      return false;
    }
  };

  const handleEditEvent = async (event: ClassEvent) => {
    try {
      // Fix the issue with toISOString by ensuring date is a Date object
      const dateObject = event.date instanceof Date
        ? event.date 
        : new Date(event.date);
      
      // Update the class with properly formatted date
      const updatedEvent = {
        ...event,
        date: dateObject.toISOString().split('T')[0]
      };

      await updateClass(event.id, updatedEvent);
      setSelectedEvent(event);
      setIsEditMode(false);
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteClass(eventId);
      setIsViewEventOpen(false);
      setSelectedEvent(null);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  };

  const handleDuplicateEvent = (event: ClassEvent) => {
    const duplicatedEvent = {
      ...event,
      id: '',
      date: new Date(event.date),
    };
    setNewEvent(duplicatedEvent);
    setIsAddEventOpen(true);
    return true;
  };

  const resetNewEventForm = () => {
    setNewEvent({
      id: '',
      title: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      studentId: '',
      studentName: '',
      subject: '',
      zoomLink: '',
      notes: '',
      tutorId: '',
      tutorName: '',
    });
  };

  const handleMarkMessageRead = async (messageId: string): Promise<void> => {
    try {
      // Changed return type to void to match the expected signature
      await fetch(`/api/messages/${messageId}/read`, { method: 'PUT' });
      
      setStudentMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast.error('Failed to mark message as read');
    }
  };

  const handleDownloadFile = async (uploadId: string): Promise<void> => {
    try {
      // Changed return type to Promise<void> to match the expected signature
      const filePath = studentUploads.find(u => u.id === uploadId)?.file_path;
      if (filePath) {
        window.open(filePath, '_blank');
      } else {
        toast.error('File not found');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const getUnreadMessageCount = (studentId: string): number => {
    return studentMessages.filter(
      (msg) => !msg.is_read && msg.student_id === studentId
    ).length;
  };

  return (
    <div className="space-y-6">
      <SchedulerHeader onAddClick={() => setIsAddEventOpen(true)} />

      <SchedulerFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        studentFilter={studentFilter}
        setStudentFilter={setStudentFilter}
        allSubjects={allSubjects || []}
        students={mockStudents}
      />

      <CalendarWithEvents
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        scheduledClasses={filteredClasses}
        onSelectEvent={handleSelectEvent}
        onAddEventClick={() => setIsAddEventOpen(true)}
        getUnreadMessageCount={getUnreadMessageCount}
      />

      <ClassDialogs
        isViewEventOpen={isViewEventOpen}
        setIsViewEventOpen={setIsViewEventOpen}
        isAddEventOpen={isAddEventOpen}
        setIsAddEventOpen={setIsAddEventOpen}
        selectedEvent={selectedEvent}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        activeEventTab={activeEventTab}
        setActiveEventTab={setActiveEventTab}
        studentMessages={studentMessages}
        studentUploads={studentUploads}
        students={mockStudents}
        onCreateEvent={handleCreateEvent}
        onEditEvent={handleEditEvent}
        onDuplicateEvent={handleDuplicateEvent}
        onDeleteEvent={handleDeleteEvent}
        onResetForm={resetNewEventForm}
        onMarkAsRead={handleMarkMessageRead}
        onDownloadFile={handleDownloadFile}
        getUnreadMessageCount={getUnreadMessageCount}
      />
    </div>
  );
};

export default TutorScheduler;
