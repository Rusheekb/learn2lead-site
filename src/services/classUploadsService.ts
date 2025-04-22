import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StudentUpload } from '@/types/classTypes';
import {
  ClassUploadRecord,
  mapToStudentUpload,
  mapToStudentUploads,
} from './utils/classMappers';

export async function fetchClassUploads(
  classId: string
): Promise<StudentUpload[]> {
  try {
    const { data, error } = await supabase
      .from('class_uploads')
      .select('*')
      .eq('class_id', classId);

    if (error) throw error;
    return mapToStudentUploads((data as ClassUploadRecord[]) || []);
  } catch (error) {
    console.error('Error fetching class uploads:', error);
    return [];
  }
}

export async function uploadClassFile(
  classId: string,
  studentName: string,
  file: File,
  note?: string
): Promise<StudentUpload | null> {
  try {
    const filename = file.name;
    const filepath = `uploads/${classId}/${filename}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('class-materials')
      .upload(filepath, file);

    if (uploadError) throw uploadError;

    // Create record in class_uploads table
    const { data, error: dbError } = await supabase
      .from('class_uploads')
      .insert({
        class_id: classId,
        student_name: studentName,
        file_name: filename,
        file_path: filepath,
        file_size: `${(file.size / 1024).toFixed(0)} KB`,
        note: note || null,
        upload_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (dbError) throw dbError;

    toast.success('File uploaded successfully');
    return data ? mapToStudentUpload(data as ClassUploadRecord) : null;
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.error('Failed to upload file');
    return null;
  }
}

export async function downloadClassFile(uploadId: string): Promise<boolean> {
  try {
    // First get the file path from the uploads table
    const { data, error } = await supabase
      .from('class_uploads')
      .select('file_path, file_name')
      .eq('id', uploadId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('File not found');

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('class-materials')
      .download(data.file_path);

    if (downloadError) throw downloadError;

    // Create a download link and trigger download
    const url = URL.createObjectURL(fileData);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
    toast.error('Failed to download file');
    return false;
  }
}
