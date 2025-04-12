
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

// Interface for message records from DB
export interface ClassMessageRecord {
  id: string;
  class_id: string;
  student_name: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

// Map DB message record to frontend model
export const mapToStudentMessage = (record: ClassMessageRecord): StudentMessage => {
  return {
    id: parseInt(record.id.substring(0, 8), 16),
    classId: parseInt(record.class_id.substring(0, 8), 16),
    studentName: record.student_name,
    message: record.message,
    timestamp: record.timestamp,
    isRead: record.is_read
  };
};

// Interface for upload records from DB
export interface ClassUploadRecord {
  id: string;
  class_id: string;
  student_name: string;
  file_name: string;
  file_size: string;
  upload_date: string;
  note: string | null;
  file_path: string;
}

// Map DB upload record to frontend model
export const mapToStudentUpload = (record: ClassUploadRecord): StudentUpload => {
  return {
    id: parseInt(record.id.substring(0, 8), 16),
    classId: parseInt(record.class_id.substring(0, 8), 16),
    studentName: record.student_name,
    fileName: record.file_name,
    fileSize: record.file_size,
    uploadDate: record.upload_date,
    note: record.note
  };
};
