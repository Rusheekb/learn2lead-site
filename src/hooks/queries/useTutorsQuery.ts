
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchTutors, createTutor, updateTutor, deleteTutor } from '@/services/tutors/tutorService';
import { Tutor } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Query keys
export const tutorsKeys = {
  all: ['tutors'] as const,
  lists: () => [...tutorsKeys.all, 'list'] as const,
  detail: (id: string) => [...tutorsKeys.all, 'detail', id] as const,
};

export const useTutorsQuery = () => {
  const queryClient = useQueryClient();

  // Fetch all tutors
  const { 
    data: tutors = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: tutorsKeys.lists(),
    queryFn: fetchTutors,
  });

  // Create a new tutor
  const createMutation = useMutation({
    mutationFn: createTutor,
    onSuccess: (newTutor) => {
      toast.success('Tutor created successfully');
      queryClient.invalidateQueries({ queryKey: tutorsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create tutor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Update a tutor
  const updateMutation = useMutation({
    mutationFn: updateTutor,
    onSuccess: (updatedTutor) => {
      toast.success('Tutor updated successfully');
      queryClient.invalidateQueries({ queryKey: tutorsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to update tutor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Delete a tutor
  const deleteMutation = useMutation({
    mutationFn: deleteTutor,
    onSuccess: (deletedTutor) => {
      toast.success('Tutor deleted successfully');
      queryClient.invalidateQueries({ queryKey: tutorsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete tutor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Setup realtime subscription to update query cache
  useEffect(() => {
    const channel = supabase
      .channel('tutor-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutors',
        },
        (payload) => {
          console.log('Realtime update for tutors:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: tutorsKeys.lists() });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New tutor added');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Tutor updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Tutor removed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tutors,
    isLoading,
    error,
    refetch: () => refetch(),
    createTutor: createMutation.mutate,
    updateTutor: updateMutation.mutate,
    deleteTutor: deleteMutation.mutate,
  };
};
