import { useEffect } from 'react';
import { Student } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useStudentRecordsRealtime(
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>
) {
  useEffect(() => {
    const channel = supabase
      .channel('student-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          setStudents((prevStudents) => [
            ...prevStudents,
            payload.new as Student,
          ]);
          toast.success('New student added');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          setStudents((prevStudents) =>
            prevStudents.map((student) =>
              student.id === payload.new.id ? (payload.new as Student) : student
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          setStudents((prevStudents) =>
            prevStudents.filter((student) => student.id !== payload.old.id)
          );
          toast.info('Student record removed');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setStudents]);
}
