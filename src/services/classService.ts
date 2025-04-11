
import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";

// Types for database records
export interface ClassLogRecord {
  id: string;
  title: string;
  subject: string;
  tutor_name: string;
  student_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendance: string;
  zoom_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database record to ClassEvent
export const mapToClassEvent = (record: ClassLogRecord): ClassEvent => {
  return {
    id: parseInt(record.id.substring(0, 8), 16), // Convert UUID to number ID
    title: record.title,
    date: new Date(record.date),
    startTime: record.start_time.substring(0, 5), // HH:MM format
    endTime: record.end_time.substring(0, 5), // HH:MM format
    studentId: parseInt(record.id.substring(0, 8), 16), // This is just a placeholder
    studentName: record.student_name,
    subject: record.subject,
    zoomLink: record.zoom_link || "",
    notes: record.notes || "",
    recurring: false, // Default to false, we'd need another field for this
    materials: [] // Default empty, we'd need to fetch materials separately
  };
};

// Convert ClassEvent to database record
export const mapToClassLogRecord = (event: ClassEvent): Omit<ClassLogRecord, 'id' | 'created_at' | 'updated_at'> => {
  return {
    title: event.title,
    subject: event.subject,
    tutor_name: "Current Tutor", // This should come from auth context in a real app
    student_name: event.studentName,
    date: event.date.toISOString().split('T')[0], // YYYY-MM-DD format
    start_time: event.startTime + ":00", // HH:MM:SS format
    end_time: event.endTime + ":00", // HH:MM:SS format
    status: "upcoming",
    attendance: "pending",
    zoom_link: event.zoomLink,
    notes: event.notes
  };
};

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
  
  return data.map(msg => ({
    id: parseInt(msg.id.substring(0, 8), 16),
    classId: parseInt(classId.substring(0, 8), 16),
    studentName: msg.student_name,
    message: msg.message,
    timestamp: msg.timestamp,
    isRead: msg.is_read
  }));
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
  
  return {
    id: parseInt(data.id.substring(0, 8), 16),
    classId: parseInt(classId.substring(0, 8), 16),
    studentName: data.student_name,
    message: data.message,
    timestamp: data.timestamp,
    isRead: data.is_read
  };
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

// Fetch uploads for a class
export const fetchClassUploads = async (classId: string): Promise<StudentUpload[]> => {
  const { data, error } = await supabase
    .from('class_uploads')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching class uploads:", error);
    return [];
  }
  
  return data.map(upload => ({
    id: parseInt(upload.id.substring(0, 8), 16),
    classId: parseInt(classId.substring(0, 8), 16),
    studentName: upload.student_name,
    fileName: upload.file_name,
    fileSize: upload.file_size,
    uploadDate: upload.upload_date,
    note: upload.note
  }));
};

// Upload a file for a class
export const uploadClassFile = async (
  classId: string, 
  studentName: string, 
  file: File, 
  note?: string
): Promise<StudentUpload | null> => {
  // First upload file to storage
  const filePath = `${classId}/${file.name}`;
  const { error: uploadError } = await supabase
    .storage
    .from('class_materials')
    .upload(filePath, file);
    
  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    return null;
  }
  
  // Then create a record in class_uploads table
  const { data, error } = await supabase
    .from('class_uploads')
    .insert({
      class_id: classId,
      student_name: studentName,
      file_name: file.name,
      file_size: `${Math.round(file.size / 1024)} KB`,
      upload_date: new Date().toISOString().split('T')[0],
      note: note || null,
      file_path: filePath
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error recording file upload:", error);
    return null;
  }
  
  return {
    id: parseInt(data.id.substring(0, 8), 16),
    classId: parseInt(classId.substring(0, 8), 16),
    studentName: data.student_name,
    fileName: data.file_name,
    fileSize: data.file_size,
    uploadDate: data.upload_date,
    note: data.note
  };
};

// Get a download URL for a file
export const getFileDownloadURL = async (filePath: string): Promise<string | null> => {
  const { data, error } = await supabase
    .storage
    .from('class_materials')
    .createSignedUrl(filePath, 60); // URL valid for 60 seconds
  
  if (error) {
    console.error("Error getting file URL:", error);
    return null;
  }
  
  return data.signedUrl;
};
