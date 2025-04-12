
import { supabase } from "@/integrations/supabase/client";
import { StudentMessage } from "@/components/shared/StudentContent";
import { 
  ClassMessageRecord, 
  mapToStudentMessage 
} from "./utils/classMappers";

// Fetch messages for a class
export const fetchClassMessages = async (classId: string): Promise<StudentMessage[]> => {
  const { data, error } = await supabase
    .from('class_messages')
    .select('*')
    .eq('class_id', classId)
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error("Error fetching class messages:", error);
    return [];
  }
  
  return (data as ClassMessageRecord[]).map(mapToStudentMessage);
};

// Create a new message
export const createClassMessage = async (
  classId: string, 
  studentName: string, 
  message: string
): Promise<StudentMessage | null> => {
  const { data, error } = await supabase
    .from('class_messages')
    .insert({
      class_id: classId,
      student_name: studentName,
      message: message
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating class message:", error);
    return null;
  }
  
  return mapToStudentMessage(data as ClassMessageRecord);
};

// Mark a message as read
export const markMessageAsRead = async (messageId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('class_messages')
    .update({ is_read: true })
    .eq('id', messageId);
  
  if (error) {
    console.error("Error marking message as read:", error);
    return false;
  }
  
  return true;
};
