
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { mockStudents } from './mock-data-students';
import SchedulerHeader from './SchedulerHeader';
import SchedulerFilter from './SchedulerFilter';
import CalendarWithEvents from './CalendarWithEvents';
import ClassDialogs from './ClassDialogs';

const TutorScheduler: React.FC = () => {
  const queryClient = useQueryClient();
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
  
  // Fetch scheduled classes
  const { data: scheduledClasses = [], isLoading } = useQuery({
    queryKey: ['scheduledClasses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_classes').select('*');
      
      if (error) {
        throw error;
      }
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.title || '',
        date: new Date(item.date),
        startTime: item.start_time?.substring(0, 5) || '00:00',
        endTime: item.end_time?.substring(0, 5) || '00:00',
        studentId: item.student_id || '',
        studentName: item.student_name || 'Student',
        subject: item.subject || '',
        zoomLink: item.zoom_link || '',
        notes: item.notes || '',
        tutorId: item.tutor_id || '',
        tutorName: item.tutor_name || 'Tutor',
      })) as ClassEvent[];
    },
  });
  
  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (classEvent: ClassEvent) => {
      const { data, error } = await supabase.from('student_classes').insert({
        id: classEvent.id,
        title: classEvent.title,
        date: classEvent.date.toISOString().split('T')[0],
        start_time: classEvent.startTime,
        end_time: classEvent.endTime,
        student_id: classEvent.studentId,
        student_name: classEvent.studentName,
        subject: classEvent.subject,
        zoom_link: classEvent.zoomLink,
        notes: classEvent.notes,
        tutor_id: classEvent.tutorId,
        tutor_name: classEvent.tutorName,
      }).select().single();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Class created successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses'] });
    },
    onError: (error) => {
      toast.error(`Failed to create class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async (classEvent: ClassEvent) => {
      const { data, error } = await supabase.from('student_classes')
        .update({
          title: classEvent.title,
          date: classEvent.date.toISOString().split('T')[0],
          start_time: classEvent.startTime,
          end_time: classEvent.endTime,
          student_id: classEvent.studentId,
          student_name: classEvent.studentName,
          subject: classEvent.subject,
          zoom_link: classEvent.zoomLink,
          notes: classEvent.notes,
        })
        .eq('id', classEvent.id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Class updated successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses'] });
    },
    onError: (error) => {
      toast.error(`Failed to update class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.from('student_classes')
        .delete()
        .eq('id', classId);
      
      if (error) {
        throw error;
      }
      
      return classId;
    },
    onSuccess: () => {
      toast.success('Class deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tutor-classes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_classes',
        },
        (payload) => {
          console.log('Realtime update for classes:', payload);
          queryClient.invalidateQueries({ queryKey: ['scheduledClasses'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Load student content (messages and uploads) when a student is selected
  useEffect(() => {
    const loadStudentContent = async () => {
      if (selectedEvent?.studentName) {
        try {
          const [messagesResult, uploadsResult] = await Promise.all([
            supabase.from('class_messages').select('*').eq('student_name', selectedEvent.studentName),
            supabase.from('class_uploads').select('*').eq('student_name', selectedEvent.studentName),
          ]);
          
          if (messagesResult.data) {
            setStudentMessages(messagesResult.data);
          }
          
          if (uploadsResult.data) {
            setStudentUploads(uploadsResult.data);
          }
        } catch (error) {
          console.error('Error loading student content:', error);
        }
      }
    };
    
    loadStudentContent();
  }, [selectedEvent]);

  // Extract all subjects
  const allSubjects = Array.from(
    new Set(scheduledClasses.map((cls) => cls.subject || ''))
  ).filter((subject) => subject.trim() !== '');

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
      await createClassMutation.mutateAsync(event);
      return true;
    } catch (error) {
      console.error('Error creating event:', error);
      return false;
    }
  };

  const handleEditEvent = async (event: ClassEvent) => {
    try {
      await updateClassMutation.mutateAsync(event);
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
      await deleteClassMutation.mutateAsync(eventId);
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

  const handleMarkMessageRead = async (messageId: string) => {
    try {
      await supabase
        .from('class_messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      setStudentMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true, read: true } : msg
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  };

  const handleDownloadFile = (filePath: string) => {
    window.open(filePath, '_blank');
    return true;
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
        allSubjects={allSubjects}
        students={mockStudents}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p>Loading classes...</p>
        </div>
      ) : (
        <CalendarWithEvents
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          scheduledClasses={filteredClasses}
          onSelectEvent={handleSelectEvent}
          onAddEventClick={() => setIsAddEventOpen(true)}
          getUnreadMessageCount={getUnreadMessageCount}
        />
      )}

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
