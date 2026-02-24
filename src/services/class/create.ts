
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ensureDateFormat } from '@/utils/safeDateUtils';

export const createScheduledClassBatch = async (
  sharedData: Record<string, any>,
  dates: string[]
): Promise<number> => {
  try {
    const rows = dates.map((date) => ({
      title: sharedData.title,
      tutor_id: sharedData.tutor_id,
      student_id: sharedData.student_id,
      date: ensureDateFormat(date),
      start_time: sharedData.start_time,
      end_time: sharedData.end_time,
      subject: sharedData.subject,
      zoom_link: sharedData.zoom_link || null,
      notes: sharedData.notes || null,
      status: sharedData.status || 'scheduled',
      attendance: sharedData.attendance || null,
      relationship_id: sharedData.relationship_id || null,
    }));

    const { data, error } = await supabase
      .from('scheduled_classes')
      .insert(rows)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  } catch (error: any) {
    toast.error(`Error scheduling classes: ${error.message}`);
    return 0;
  }
};

export const createScheduledClass = async (
  classData: Record<string, any>
): Promise<string | null> => {
  try {
    // Ensure required fields are present
    const requiredFields = {
      title: classData.title,
      tutor_id: classData.tutor_id,
      student_id: classData.student_id,
      date: classData.date,
      start_time: classData.start_time,
      end_time: classData.end_time,
      subject: classData.subject,
    };

    // Check that all required fields have values
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        toast.error(`Missing required field: ${key}`);
        return null;
      }
    }

    // Create a properly typed object for insertion
    const insertData = {
      title: classData.title,
      tutor_id: classData.tutor_id,
      student_id: classData.student_id,
      date: ensureDateFormat(classData.date), // Ensure proper date format to prevent timezone issues
      start_time: classData.start_time,
      end_time: classData.end_time,
      subject: classData.subject,
      zoom_link: classData.zoom_link || null,
      notes: classData.notes || null,
      status: classData.status || 'scheduled',
      attendance: classData.attendance || null,
    };

    const { data, error } = await supabase
      .from('scheduled_classes')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    toast.success('Class scheduled successfully');
    return data?.id || null;
  } catch (error: any) {
    toast.error(`Error scheduling class: ${error.message}`);
    return null;
  }
};
