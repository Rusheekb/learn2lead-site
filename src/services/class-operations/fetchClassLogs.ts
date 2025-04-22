import { supabase } from '@/integrations/supabase/client';
import { ClassEvent } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from '../utils/classEventMapper';

/**
 * Fetch all class logs from the database
 */
export const fetchClassLogs = async (): Promise<ClassEvent[]> => {
  console.log('Fetching class logs from Supabase...');
  try {
    const { data, error } = await supabase.from('class_logs').select('*');

    if (error) {
      console.error('Error fetching class logs:', error);
      return [];
    }

    console.log('Raw class logs data:', data);

    if (!data || data.length === 0) {
      return [];
    }

    const transformedLogs = data.map(transformDbRecordToClassEvent);
    console.log('Transformed class logs:', transformedLogs);

    // Sort logs by date (most recent first)
    return transformedLogs.sort((a, b) => {
      const dateA =
        a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const dateB =
        b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error in fetchClassLogs:', error);
    return [];
  }
};
