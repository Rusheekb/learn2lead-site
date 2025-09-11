import { useState, useEffect } from 'react';
import { fetchStudentNotes, createStudentNote, StudentNote } from '@/services/studentNotes';
import { useToast } from '@/hooks/use-toast';

export const useStudentNotes = (studentId: string | null) => {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!studentId) {
      setNotes([]);
      return;
    }

    const loadNotes = async () => {
      setLoading(true);
      try {
        const studentNotes = await fetchStudentNotes(studentId);
        setNotes(studentNotes);
      } catch (error) {
        console.error('Failed to load student notes:', error);
        toast({
          title: 'Error',
          description: 'Failed to load student notes',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [studentId, toast]);

  const addNote = async (title: string, content: string) => {
    if (!studentId) return;

    setCreating(true);
    try {
      const newNote = await createStudentNote(studentId, title, content);
      setNotes(prev => [newNote, ...prev]);
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
    } catch (error) {
      console.error('Failed to create note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return {
    notes,
    loading,
    creating,
    addNote,
  };
};