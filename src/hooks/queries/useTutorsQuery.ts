
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchTutors, createTutor, updateTutor, deleteTutor } from '@/services/tutors/tutorService';
import { Tutor } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// Query keys
export const tutorsKeys = {
  all: ['tutors'] as const,
  lists: () => [...tutorsKeys.all, 'list'] as const,
  paginated: (page: number, pageSize: number, search: string) => 
    [...tutorsKeys.lists(), { page, pageSize, search }] as const,
  detail: (id: string) => [...tutorsKeys.all, 'detail', id] as const,
};

interface UseTutorsQueryOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export const useTutorsQuery = (options: UseTutorsQueryOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(options.initialPage || 1);
  const [pageSize, setPageSize] = useState(options.initialPageSize || 10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch all tutors
  const { 
    data: tutorsResponse, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: tutorsKeys.paginated(page, pageSize, debouncedSearchTerm),
    queryFn: () => fetchTutors({
      page,
      pageSize,
      searchTerm: debouncedSearchTerm
    }),
  });

  const tutors = tutorsResponse?.data || [];
  const totalCount = tutorsResponse?.count || 0;
  const hasNextPage = tutorsResponse?.hasMore || false;
  const hasPrevPage = page > 1;
  const totalPages = Math.ceil(totalCount / pageSize);

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
    mutationFn: (params: { id: string, updates: Partial<Tutor> }) => 
      updateTutor(params.id, params.updates),
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

  const nextPage = () => {
    if (hasNextPage) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      setPage(prevPage => prevPage - 1);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const changePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page
  };

  return {
    tutors,
    isLoading,
    error,
    refetch: () => refetch(),
    createTutor: createMutation.mutate,
    updateTutor: (id: string, updates: Partial<Tutor>) => 
      updateMutation.mutate({ id, updates }),
    deleteTutor: deleteMutation.mutate,
    // Pagination controls
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    changePageSize,
    // Search controls
    searchTerm,
    setSearchTerm,
  };
};
