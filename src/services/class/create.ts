
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      date: classData.date,
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
