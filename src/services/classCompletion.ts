import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompleteClassData {
  classId: string;
  classNumber: string;
  tutorName: string;
  studentName: string;
  date: string;
  day: string;
  timeCst: string;
  timeHrs: string;
  subject: string;
  content: string;
  hw: string;
  additionalInfo: string;
}

export const completeClass = async (data: CompleteClassData): Promise<boolean> => {
  try {
    // First, check if the class still exists
    const { data: existingClass, error: classError } = await supabase
      .from('scheduled_classes')
      .select('id')
      .eq('id', data.classId)
      .maybeSingle();

    if (classError) {
      console.error('Error checking class existence:', classError);
      throw new Error('Failed to verify class existence');
    }

    if (!existingClass) {
      toast.error('Class no longer exists or has already been completed');
      return false;
    }

    // Check if class log already exists
    const { data: existingLog, error: logCheckError } = await supabase
      .from('class_logs')
      .select('id')
      .eq('Class ID', data.classId)
      .maybeSingle();

    if (logCheckError) {
      console.error('Error checking class log existence:', logCheckError);
      throw new Error('Failed to check class log status');
    }

    if (existingLog) {
      toast.error('This class has already been completed');
      return false;
    }

    // Create class log entry
    const { error: insertError } = await supabase
      .from('class_logs')
      .insert({
        'Class Number': data.classNumber,
        'Tutor Name': data.tutorName,
        'Student Name': data.studentName,
        'Date': data.date,
        'Day': data.day,
        'Time (CST)': data.timeCst,
        'Time (hrs)': data.timeHrs,
        'Subject': data.subject,
        'Content': data.content,
        'HW': data.hw,
        'Class ID': data.classId,
        'Additional Info': data.additionalInfo,
        'Student Payment': 'Pending',
        'Tutor Payment': 'Pending'
      });

    if (insertError) {
      console.error('Error creating class log:', insertError);
      throw new Error('Failed to create class log');
    }

    // Delete the scheduled class
    const { error: deleteError } = await supabase
      .from('scheduled_classes')
      .delete()
      .eq('id', data.classId);

    if (deleteError) {
      console.error('Error deleting scheduled class:', deleteError);
      // If delete fails, try to remove the class log we just created
      await supabase
        .from('class_logs')
        .delete()
        .eq('Class ID', data.classId);
      throw new Error('Failed to remove completed class from schedule');
    }

    toast.success('Class completed successfully');
    return true;

  } catch (error) {
    console.error('Error completing class:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete class';
    toast.error(errorMessage);
    return false;
  }
};