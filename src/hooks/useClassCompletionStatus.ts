import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useClassCompletionStatus = (classId: string) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!classId) return;

    try {
      const { data, error } = await supabase
        .from('class_logs')
        .select('id')
        .eq('Class ID', classId)
        .maybeSingle();

      if (error) {
        console.error('Error checking completion status:', error);
        return;
      }

      setIsCompleted(!!data);
    } catch (error) {
      console.error('Error in checkStatus:', error);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isCompleted,
    isLoading,
    setIsCompleted,
    refetch: checkStatus,
  };
};