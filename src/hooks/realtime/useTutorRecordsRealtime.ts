
import { useEffect } from 'react';
import { Tutor } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTutorRecordsRealtime(
  setTutors: React.Dispatch<React.SetStateAction<Tutor[]>>
) {
  useEffect(() => {
    const channel = supabase
      .channel('tutor-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tutors',
        },
        (payload) => {
          setTutors((prevTutors) => [...prevTutors, payload.new as Tutor]);
          toast.success('New tutor added');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tutors',
        },
        (payload) => {
          setTutors((prevTutors) =>
            prevTutors.map((tutor) =>
              tutor.id === payload.new.id ? (payload.new as Tutor) : tutor
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tutors',
        },
        (payload) => {
          setTutors((prevTutors) =>
            prevTutors.filter((tutor) => tutor.id !== payload.old.id)
          );
          toast.info('Tutor record removed');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setTutors]);
}
