
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchClassLogs, createClassLog, updateClassLog, deleteClassLog } from '@/services/classLogsService';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect } from 'react';

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

  // Update a class log
  const updateMutation = useMutation({
    mutationFn: (params: { id: string, classEvent: Partial<ClassEvent> }) => 
      updateClassLog(params.id, params.classEvent),
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
