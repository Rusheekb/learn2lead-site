
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchStudents, createStudent, updateStudent, deleteStudent } from '@/services/students/studentService';
import { Student } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// Query keys
export const studentsKeys = {
  all: ['students'] as const,
  lists: () => [...studentsKeys.all, 'list'] as const,
  paginated: (page: number, pageSize: number, search: string) => 
    [...studentsKeys.lists(), { page, pageSize, search }] as const,
  detail: (id: string) => [...studentsKeys.all, 'detail', id] as const,
};

interface UseStudentsQueryOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export const useStudentsQuery = (options: UseStudentsQueryOptions = {}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(options.initialPage || 1);
  const [pageSize, setPageSize] = useState(options.initialPageSize || 10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch all students
  const { 
    data: studentResponse,
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: studentsKeys.paginated(page, pageSize, debouncedSearchTerm),
    queryFn: () => fetchStudents({
      page,
      pageSize,
      searchTerm: debouncedSearchTerm
    }),
  });

  const students = studentResponse?.data || [];
  const totalCount = studentResponse?.count || 0;
  const hasNextPage = studentResponse?.hasMore || false;
  const hasPrevPage = page > 1;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Create a new student
  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: (newStudent) => {
      toast.success('Student created successfully');
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to create student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Update a student
  const updateMutation = useMutation({
    mutationFn: (params: { id: string, updates: Partial<Student> }) => 
      updateStudent(params.id, params.updates),
    onSuccess: (updatedStudent) => {
      toast.success('Student updated successfully');
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to update student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Delete a student
  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: (deletedStudent) => {
      toast.success('Student deleted successfully');
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
    },
    onError: (error) => {
      toast.error(`Failed to delete student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  // Setup realtime subscription to update query cache
  useEffect(() => {
    const channel = supabase
      .channel('student-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          console.log('Realtime update for students:', payload);
          
          // Invalidate the query to refetch data
          queryClient.invalidateQueries({ queryKey: studentsKeys.lists() });
          
          // Show toast based on the event type
          if (payload.eventType === 'INSERT') {
            toast.info('New student added');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Student updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Student removed');
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
    students,
    isLoading,
    error,
    refetch: () => refetch(),
    createStudent: createMutation.mutate,
    updateStudent: (id: string, updates: Partial<Student>) => 
      updateMutation.mutate({ id, updates }),
    deleteStudent: deleteMutation.mutate,
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
