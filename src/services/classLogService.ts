import { supabase } from '@/integrations/supabase/client';

export interface ClassLogUpdate {
  content?: string;
  homework?: string;
  additionalInfo?: string;
}

export const updateClassLogByClassId = async (
  classId: string,
  updates: ClassLogUpdate
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('class_logs')
      .update({
        Content: updates.content,
        HW: updates.homework,
        'Additional Info': updates.additionalInfo,
      })
      .eq('Class ID', classId);

    if (error) {
      console.error('Error updating class log:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateClassLogByClassId:', error);
    return false;
  }
};

export const getClassLogByClassId = async (classId: string) => {
  try {
    const { data, error } = await supabase
      .from('class_logs')
      .select('*')
      .eq('Class ID', classId)
      .single();

    if (error) {
      console.error('Error fetching class log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getClassLogByClassId:', error);
    return null;
  }
};