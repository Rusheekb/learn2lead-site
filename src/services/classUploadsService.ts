
import { supabase } from "@/integrations/supabase/client";
import { StudentUpload } from "@/components/shared/StudentContent";
import { 
  ClassUploadRecord, 
  mapToStudentUpload 
} from "./utils/classMappers";

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
  
  return (data as ClassUploadRecord[]).map(mapToStudentUpload);
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
  
  return mapToStudentUpload(data as ClassUploadRecord);
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
