import { StudentMessage, StudentUpload } from '@/types/classTypes';

// Define database record types
export interface ClassMessageRecord {
  id: string;
  class_id: string;
  student_name: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  created_at?: string;
}

export interface ClassUploadRecord {
  id: string;
  class_id: string;
  student_name: string;
  file_name: string;
  file_path: string;
  file_size: string;
  upload_date: string;
  note: string | null;
  created_at?: string;
}

// Map database record to StudentMessage type
export const mapToStudentMessage = (
  record: ClassMessageRecord
): StudentMessage => {
  return {
    id: record.id,
    classId: record.class_id,
    studentName: record.student_name,
    message: record.message,
    content: record.message,
    timestamp:
      record.timestamp || record.created_at || new Date().toISOString(),
    isRead: record.is_read,
    read: record.is_read,
    sender: 'student', // Default sender
  };
};

// Map database record to StudentUpload type
export const mapToStudentUpload = (
  record: ClassUploadRecord
): StudentUpload => {
  return {
    id: record.id,
    classId: record.class_id,
    studentName: record.student_name,
    fileName: record.file_name,
    fileSize: record.file_size,
    uploadDate: record.upload_date,
    note: record.note,
  };
};

// Map array of database records to array of app types
export const mapToStudentMessages = (
  records: ClassMessageRecord[]
): StudentMessage[] => {
  return records.map(mapToStudentMessage);
};

export const mapToStudentUploads = (
  records: ClassUploadRecord[]
): StudentUpload[] => {
  return records.map(mapToStudentUpload);
};
