
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchStudents, createStudent, updateStudent, deleteStudent } from '@/services/students/studentService';
import { Student } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Query keys
export const studentsKeys = {
  all: ['students'] as const,
  lists: () => [...studentsKeys.all, 'list'] as const,
  detail: (id: string) => [...studentsKeys.all, 'detail', id] as const,
};

export const useStudentsQuery = () => {
  const queryClient = useQueryClient();

  // Fetch all students
  const { 
    data: students = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: studentsKeys.lists(),
    queryFn: fetchStudents,
  });

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

  return {
    students,
    isLoading,
    error,
    refetch: () => refetch(),
    createStudent: createMutation.mutate,
    updateStudent: (id: string, updates: Partial<Student>) => 
      updateMutation.mutate({ id, updates }),
    deleteStudent: deleteMutation.mutate,
  };
};
