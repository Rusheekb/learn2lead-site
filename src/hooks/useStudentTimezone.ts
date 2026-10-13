import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** A student's saved time zone (null until they've signed in once). */
export const useStudentTimezone = (studentId?: string | null) =>
  useQuery({
    queryKey: ['profile-timezone', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', studentId!)
        .maybeSingle();
      return data?.timezone ?? null;
    },
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
  });
