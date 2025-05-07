
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchClassLogs, createClassLog, updateClassLog, deleteClassLog } from '@/services/classLogsService';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { format } from 'date-fns';

// Query keys
export const classLogsKeys = {
  all: ['classLogs'] as const,
  lists: () => [...classLogsKeys.all, 'list'] as const,
  detail: (id: string) => [...classLogsKeys.all, 'detail', id] as const,
};

export const useClassLogsQuery = () => {
  const queryClient = useQueryClient();

  // Fetch all class logs
  const { 
    data: classes = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: classLogsKeys.lists(),
    queryFn: fetchClassLogs,
  });

  // Create a new class log
  const createMutation = useMutation({
    mutationFn: createClassLog,
    onSuccess: (newClass) => {
      toast.success('Class log created successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Update a class log - Convert ClassEvent to DbClassLog format
  const updateMutation = useMutation({
    mutationFn: (params: { id: string, classEvent: Partial<ClassEvent> }) => {
      const { id, classEvent } = params;
      
      // Convert from ClassEvent to DbClassLog format
      const dbUpdates: Record<string, any> = {};
      
      if (classEvent.title !== undefined) dbUpdates['Class Number'] = classEvent.title;
      if (classEvent.tutorName !== undefined) dbUpdates['Tutor Name'] = classEvent.tutorName;
      if (classEvent.studentName !== undefined) dbUpdates['Student Name'] = classEvent.studentName;
      if (classEvent.date !== undefined) {
        // Convert Date object to string format expected by database
        const dateValue = classEvent.date instanceof Date 
          ? format(classEvent.date, 'yyyy-MM-dd')
          : classEvent.date;
        dbUpdates['Date'] = dateValue;
      }
      if (classEvent.startTime !== undefined) dbUpdates['Time (CST)'] = classEvent.startTime;
      if (classEvent.duration !== undefined) dbUpdates['Time (hrs)'] = classEvent.duration.toString();
      if (classEvent.subject !== undefined) dbUpdates['Subject'] = classEvent.subject;
      if (classEvent.content !== undefined) dbUpdates['Content'] = classEvent.content;
      if (classEvent.homework !== undefined) dbUpdates['HW'] = classEvent.homework;
      if (classEvent.classCost !== undefined) dbUpdates['Class Cost'] = classEvent.classCost?.toString();
      if (classEvent.tutorCost !== undefined) dbUpdates['Tutor Cost'] = classEvent.tutorCost?.toString();
      if (classEvent.notes !== undefined) dbUpdates['Additional Info'] = classEvent.notes;
      if (classEvent.studentPayment !== undefined) dbUpdates['Student Payment'] = classEvent.studentPayment;
      if (classEvent.tutorPayment !== undefined) dbUpdates['Tutor Payment'] = classEvent.tutorPayment;
      if (classEvent.status !== undefined) dbUpdates['Status'] = classEvent.status;
      if (classEvent.attendance !== undefined) dbUpdates['Attendance'] = classEvent.attendance;
      
      return updateClassLog(id, dbUpdates);
    },
    onSuccess: (updatedClass) => {
      toast.success('Class log updated successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to update class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Delete a class log
  const deleteMutation = useMutation({
    mutationFn: deleteClassLog,
    onSuccess: (deletedClass) => {
      toast.success('Class log deleted successfully');
      queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete class log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Setup realtime subscription to update query cache
  useEffect(() => {
    const channel = supabase
      .channel('class-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_logs',
        },
        (payload) => {
          console.log('Realtime update for class logs:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: classLogsKeys.lists() });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New class log added');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Class log updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Class log removed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Extract unique subjects
  const allSubjects = Array.from(new Set(classes.map((cls) => cls.subject || '')))
    .filter(subject => subject.trim() !== '');

  return {
    classes,
    isLoading,
    error,
    refetch: () => refetch(),
    createClass: createMutation.mutate,
    updateClass: (id: string, classEvent: Partial<ClassEvent>) => 
      updateMutation.mutate({ id, classEvent }),
    deleteClass: deleteMutation.mutate,
    allSubjects,
  };
};
