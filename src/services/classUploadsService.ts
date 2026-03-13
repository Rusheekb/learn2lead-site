import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StudentUpload } from '@/types/classTypes';
import {
  ClassUploadRecord,
  mapToStudentUpload,
  mapToStudentUploads,
} from './utils/classMappers';
import { logger } from '@/lib/logger';

const log = logger.create('classUploads');

export async function fetchClassUploads(
  classId: string
): Promise<StudentUpload[]> {
  try {
    const { data, error } = await supabase
      .from('class_uploads')
      .select('*')
      .eq('class_id', classId);

    if (error) throw error;
    
    const uploads = (data as ClassUploadRecord[]) || [];
    const validUploads: ClassUploadRecord[] = [];
    
    for (const upload of uploads) {
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('materials')
          .list(upload.file_path.split('/').slice(0, -1).join('/'), {
            search: upload.file_path.split('/').pop()
          });
        
        if (!fileError && fileData && fileData.length > 0) {
          validUploads.push(upload);
        }
      } catch (fileCheckError) {
        log.warn(`File ${upload.file_path} not found in storage, skipping`);
      }
    }
    
    return mapToStudentUploads(validUploads);
  } catch (error) {
    log.error('Error fetching class uploads', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'materials');
    formData.append('path', `class_uploads/${classId}/`);

    const { data: uploadResult, error: uploadError } = await supabase.functions.invoke(
      'secure-file-upload',
      {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (uploadError || !uploadResult?.success) {
      log.error('Secure upload error', uploadError || uploadResult?.error);
      throw new Error(uploadResult?.error || 'Failed to upload file securely');
    }

    const uploadRecord = {
      class_id: classId,
      student_name: studentName,
      file_name: file.name,
      file_path: uploadResult.path,
      file_size: `${(file.size / 1024).toFixed(0)} KB`,
      upload_date: new Date().toISOString().split('T')[0],
      note: note || null,
    };

    const { data, error: dbError } = await supabase
      .from('class_uploads')
      .insert(uploadRecord)
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from('materials').remove([uploadResult.path]);
      throw dbError;
    }

    toast.success('File uploaded successfully');
    return data ? mapToStudentUpload(data as ClassUploadRecord) : null;
  } catch (error) {
    log.error('Error uploading file', error);
    toast.error('Failed to upload file');
    return null;
  }
}

export async function downloadClassFile(uploadId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('class_uploads')
      .select('file_path, file_name')
      .eq('id', uploadId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('File not found');

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('materials')
      .download(data.file_path);

    if (downloadError) throw downloadError;

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
    log.error('Error downloading file', error);
    toast.error('Failed to download file');
    return false;
  }
}

export async function viewClassFile(uploadId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('class_uploads')
      .select('file_path, file_name')
      .eq('id', uploadId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('File not found');

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('materials')
      .createSignedUrl(data.file_path, 3600);

    if (urlError) throw urlError;

    window.open(signedUrlData.signedUrl, '_blank');
    return true;
  } catch (error) {
    log.error('Error viewing file', error);
    toast.error('Failed to open file');
    return false;
  }
}

export async function deleteClassFile(uploadId: string): Promise<boolean> {
  try {
    const { data: uploadData, error } = await supabase
      .from('class_uploads')
      .select('file_path, file_name')
      .eq('id', uploadId)
      .single();

    if (error) throw error;
    if (!uploadData) throw new Error('File not found');

    const { error: storageError } = await supabase.storage
      .from('materials')
      .remove([uploadData.file_path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from('class_uploads')
      .delete()
      .eq('id', uploadId);

    if (dbError) throw dbError;

    toast.success(`Deleted ${uploadData.file_name}`);
    return true;
  } catch (error) {
    log.error('Error deleting file', error);
    toast.error('Failed to delete file');
    return false;
  }
}
