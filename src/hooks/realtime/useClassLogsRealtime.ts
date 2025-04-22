import { useEffect } from 'react';
import { ClassEvent } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useClassLogsRealtime(
  setClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>
) {
  useEffect(() => {
    const channel = supabase
      .channel('class-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'class_logs',
        },
        (payload) => {
          setClasses((prevClasses) => [
            ...prevClasses,
            payload.new as ClassEvent,
          ]);
          toast.success('New class log added');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'class_logs',
        },
        (payload) => {
          setClasses((prevClasses) =>
            prevClasses.map((cls) =>
              cls.id === payload.new.id ? (payload.new as ClassEvent) : cls
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'class_logs',
        },
        (payload) => {
          setClasses((prevClasses) =>
            prevClasses.filter((cls) => cls.id !== payload.old.id)
          );
          toast.info('Class log removed');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setClasses]);
}
