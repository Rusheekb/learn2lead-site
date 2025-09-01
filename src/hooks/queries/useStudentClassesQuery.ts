
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassItem, StudentMessage, StudentUpload } from '@/types/classTypes';
import { useEffect } from 'react';
import { toast } from 'sonner';

// Query keys
export const studentKeys = {
  all: ['student'] as const,
  classes: (studentName: string) => [...studentKeys.all, 'classes', studentName] as const,
  messages: (studentName: string) => [...studentKeys.all, 'messages', studentName] as const,
  uploads: (studentName: string) => [...studentKeys.all, 'uploads', studentName] as const,
  scheduledClasses: (studentId: string) => ['studentClasses', studentId] as const,
};

// Fetch student classes
export const useStudentClassesQuery = (studentName: string, studentId?: string) => {
  const queryClient = useQueryClient();

  const fetchStudentClasses = async () => {
    const { data, error } = await supabase
      .from('class_logs')
      .select('*')
      .eq('Student Name', studentName);
      
    if (error) {
      throw error;
    }
    
    return (data || []).map(item => ({
      id: item.id,
      title: item['Class Number'] || '',
      subject: item.Subject || '',
      tutorName: item['Tutor Name'] || '',
      studentName: item['Student Name'] || '',
      date: item.Date || '',
      startTime: item['Time (CST)'] ? item['Time (CST)'].substring(0, 5) : '',
      endTime: item['Time (CST)'] ? item['Time (CST)'].substring(6) : '',
      status: 'completed',
      attendance: 'present',
      zoomLink: '',
      notes: item['Additional Info'] || '',
      subjectId: item.Subject || '',
      recurring: false,
    })) as ClassItem[];
  };

  const { data: classes = [], isLoading, error, refetch } = useQuery({
    queryKey: studentKeys.classes(studentName),
    queryFn: fetchStudentClasses,
    enabled: !!studentName,
  });

  // Setup realtime subscription for class_logs
  useEffect(() => {
    if (!studentName) return;
    
    const channel = supabase
      .channel('student-class-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_logs',
          filter: `Student Name=eq.${studentName}`,
        },
        (payload) => {
          console.log('Realtime update for student classes:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: studentKeys.classes(studentName) });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New class added');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, studentName]);

  // Setup realtime subscription for scheduled_classes if studentId is provided
  useEffect(() => {
    if (!studentId) return;
    
    const channel = supabase
      .channel('student-scheduled-classes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_classes',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          console.log('Realtime update for student scheduled classes:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: studentKeys.scheduledClasses(studentId) });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            const newClass = payload.new;
            toast.success(`New class "${newClass.title}" scheduled`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedClass = payload.new;
            toast.info(`Class "${updatedClass.title}" updated`);
          } else if (payload.eventType === 'DELETE') {
            toast.info('A class has been cancelled');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, studentId]);

  return {
    classes,
    isLoading,
    error,
    refetchClasses: refetch,
  };
};

// Student messages functionality removed since table was deleted
export const useStudentMessagesQuery = (studentName: string) => {
  const messages: any[] = [];
  const isLoading = false;
  const error = null;
  const refetch = () => Promise.resolve();

  return {
    messages,
    isLoading,
    error,
    refetchMessages: refetch,
  };
};

// Fetch student uploads
export const useStudentUploadsQuery = (studentName: string) => {
  const queryClient = useQueryClient();

  const fetchStudentUploads = async () => {
    const { data, error } = await supabase
      .from('class_uploads')
      .select('*')
      .eq('student_name', studentName);
      
    if (error) {
      throw error;
    }
    
    return (data || []).map(item => ({
      id: item.id,
      classId: item.class_id,
      studentName: item.student_name,
      fileName: item.file_name,
      fileSize: item.file_size,
      uploadDate: item.upload_date,
      note: item.note,
    })) as StudentUpload[];
  };

  const { data: uploads = [], isLoading, error, refetch } = useQuery({
    queryKey: studentKeys.uploads(studentName),
    queryFn: fetchStudentUploads,
    enabled: !!studentName,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!studentName) return;
    
    const channel = supabase
      .channel('student-uploads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_uploads',
          filter: `student_name=eq.${studentName}`,
        },
        (payload) => {
          console.log('Realtime update for student uploads:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: studentKeys.uploads(studentName) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, studentName]);

  return {
    uploads,
    isLoading,
    error,
    refetchUploads: refetch,
  };
};
