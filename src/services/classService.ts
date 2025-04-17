
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClassEvent } from "@/types/tutorTypes";
import { parseTime24to12 } from "@/utils/dateTimeUtils";

export interface ScheduledClass {
  id: string;
  title: string;
  tutor_id: string;
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  zoom_link: string | null;
  notes: string | null;
  status: string;
  attendance: string | null;
  created_at: string;
  updated_at: string;
  tutor_name?: string;
  student_name?: string;
}

export const fetchScheduledClasses = async (tutorId?: string, studentId?: string): Promise<ClassEvent[]> => {
  try {
    let query = supabase.from('student_classes').select('*');
    
    if (tutorId) {
      query = query.eq('tutor_id', tutorId);
    }
    
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    const { data, error } = await query.order('date', { ascending: true }).order('start_time');
    
    if (error) throw error;
    
    const classEvents: ClassEvent[] = (data || []).map(cls => ({
      id: cls.id,
      title: cls.title,
      tutorName: cls.tutor_name || '',
      studentName: cls.student_name || '',
      date: new Date(cls.date),
      startTime: cls.start_time.substring(0, 5),
      endTime: cls.end_time.substring(0, 5),
      subject: cls.subject,
      zoomLink: cls.zoom_link,
      notes: cls.notes,
      status: cls.status,
      attendance: cls.attendance,
      studentId: cls.student_id,
      tutorId: cls.tutor_id
    }));
    
    return classEvents;
  } catch (error: any) {
    toast.error(`Error loading scheduled classes: ${error.message}`);
    return [];
  }
};

export const createScheduledClass = async (classData: Partial<ScheduledClass>): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('scheduled_classes')
      .insert(classData)
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

export const updateScheduledClass = async (id: string, classData: Partial<ScheduledClass>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scheduled_classes')
      .update({
        ...classData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    toast.success('Class updated successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error updating class: ${error.message}`);
    return false;
  }
};

export const deleteScheduledClass = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scheduled_classes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    toast.success('Class deleted successfully');
    return true;
  } catch (error: any) {
    toast.error(`Error deleting class: ${error.message}`);
    return false;
  }
};
