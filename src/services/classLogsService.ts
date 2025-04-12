
import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { 
  ClassLogRecord, 
  mapToClassEvent, 
  mapToClassLogRecord 
} from "./utils/classMappers";

// Fetch all class logs
export const fetchClassLogs = async (): Promise<ClassEvent[]> => {
  const { data, error } = await supabase
    .from('class_logs')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) {
    console.error("Error fetching class logs:", error);
    return [];
  }
  
  return (data as ClassLogRecord[]).map(mapToClassEvent);
};

// Create a new class log
export const createClassLog = async (classEvent: ClassEvent): Promise<ClassEvent | null> => {
  const record = mapToClassLogRecord(classEvent);
  
  const { data, error } = await supabase
    .from('class_logs')
    .insert(record)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating class log:", error);
    return null;
  }
  
  return mapToClassEvent(data as ClassLogRecord);
};

// Update an existing class log
export const updateClassLog = async (id: string, classEvent: Partial<ClassEvent>): Promise<ClassEvent | null> => {
  // Convert from ClassEvent partial to ClassLogRecord partial
  const updateData: any = {};
  
  if (classEvent.title) updateData.title = classEvent.title;
  if (classEvent.subject) updateData.subject = classEvent.subject;
  if (classEvent.studentName) updateData.student_name = classEvent.studentName;
  if (classEvent.date) updateData.date = classEvent.date.toISOString().split('T')[0];
  if (classEvent.startTime) updateData.start_time = classEvent.startTime + ":00";
  if (classEvent.endTime) updateData.end_time = classEvent.endTime + ":00";
  if (classEvent.zoomLink !== undefined) updateData.zoom_link = classEvent.zoomLink;
  if (classEvent.notes !== undefined) updateData.notes = classEvent.notes;
  
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('class_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating class log:", error);
    return null;
  }
  
  return mapToClassEvent(data as ClassLogRecord);
};

// Delete a class log
export const deleteClassLog = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error("Error deleting class log:", error);
    return false;
  }
  
  return true;
};
