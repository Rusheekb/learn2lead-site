
import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { format } from "date-fns";
import { UpdateDbClassLog } from "./types";
import { transformClassLog } from "./transformers";
import { Database } from "@/integrations/supabase/types";

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];

// Update an existing class log
export const updateClassLog = async (id: string, classEvent: Partial<ClassEvent>): Promise<ClassEvent | null> => {
  const updateData: UpdateDbClassLog = {};
  
  if (classEvent.classNumber) updateData.class_number = classEvent.classNumber;
  if (classEvent.tutorName) updateData.tutor_name = classEvent.tutorName;
  if (classEvent.studentName) updateData.student_name = classEvent.studentName;
  if (classEvent.date) {
    updateData.date = format(classEvent.date, 'yyyy-MM-dd');
    updateData.day = format(classEvent.date, 'EEEE');
  }
  if (classEvent.startTime) updateData.time_cst = classEvent.startTime;
  if (classEvent.duration) updateData.time_hrs = classEvent.duration.toString();
  if (classEvent.subject) updateData.subject = classEvent.subject;
  if (classEvent.content !== undefined) updateData.content = classEvent.content || null;
  if (classEvent.homework !== undefined) updateData.hw = classEvent.homework || null;
  if (classEvent.classCost !== undefined) updateData.class_cost = classEvent.classCost?.toString() || null;
  if (classEvent.tutorCost !== undefined) updateData.tutor_cost = classEvent.tutorCost?.toString() || null;
  if (classEvent.notes !== undefined) updateData.additional_info = classEvent.notes || null;
  
  const { data, error } = await supabase
    .from<ClassLogs>('class_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating class log:", error);
    return null;
  }

  if (!data) {
    return null;
  }
  
  return transformClassLog(data);
};

// Delete a class log
export const deleteClassLog = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from<ClassLogs>('class_logs')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error("Error deleting class log:", error);
    return false;
  }
  
  return true;
}; 
