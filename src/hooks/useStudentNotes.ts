import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStudentNotes, createStudentNote } from '@/services/studentNotes';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

const log = logger.create('useStudentNotes');

export const useStudentNotes = (studentId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading: loading } = useQuery({
    queryKey: ['student-notes', studentId],
    queryFn: () => {
      if (!studentId) return [];
      return fetchStudentNotes(studentId);
    },
    enabled: !!studentId,
    meta: {
      onError: (error: unknown) => {
        log.error('Failed to load student notes', error);
        toast({
          title: 'Error',
          description: 'Failed to load student notes',
          variant: 'destructive',
        });
      },
    },
  });

  const { mutate: addNote, isPending: creating } = useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) => {
      if (!studentId) throw new Error('No student selected');
      return createStudentNote(studentId, title, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-notes', studentId] });
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
    },
    onError: (error) => {
      log.error('Failed to create note', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    },
  });

  const handleAddNote = (title: string, content: string) => {
    addNote({ title, content });
  };

  return {
    notes,
    loading,
    creating,
    addNote: handleAddNote,
  };
};
