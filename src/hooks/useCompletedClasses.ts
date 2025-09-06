import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClassEvent } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from '@/services/class-operations/utils/classEventMapper';

export const useCompletedClasses = (userRole: 'student' | 'tutor' | 'admin') => {
  const { user } = useAuth();
  const [completedClasses, setCompletedClasses] = useState<ClassEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompletedClasses = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get user profile for name matching
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      
      let query = supabase.from('class_logs').select('*');
      
      if (userRole === 'tutor') {
        query = query.or(`Tutor Name.eq.${fullName},Tutor Name.eq.${profile.email}`);
      } else if (userRole === 'student') {
        query = query.or(`Student Name.eq.${fullName},Student Name.eq.${profile.email}`);
      }

      const { data, error } = await query.order('Date', { ascending: false });

      if (error) throw error;

      // Transform to ClassEvent format
      const transformedClasses = (data || []).map(item => transformDbRecordToClassEvent(item as any));
      setCompletedClasses(transformedClasses);
    } catch (error) {
      console.error('Error fetching completed classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedClasses();
  }, [user, userRole]);

  // Setup realtime subscription for class_logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('completed-classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_logs',
        },
        (payload) => {
          console.log('Realtime update for completed classes:', payload);
          fetchCompletedClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  return {
    completedClasses,
    isLoading,
    refetch: fetchCompletedClasses,
  };
};