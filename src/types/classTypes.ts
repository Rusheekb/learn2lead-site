
export interface ClassSession {
  id: string;
  title: string;
  subjectId: string;
  tutorName: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  zoomLink: string;
  recurring: boolean;
  recurringDays?: string[];
  studentName?: string;
}

export interface StudentMessage {
  id: string;
  content: string;
  timestamp: string;
  read: boolean;
  sender: 'student' | 'tutor';
  text?: string;
  classId?: string;
  studentName?: string;
  message?: string;
  isRead?: boolean;
}

export interface StudentUpload {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: string;
  uploadPath?: string;
  classId?: string;
  studentName?: string;
  note?: string | null;
}

export interface ClassItem {
  id: string;
  title: string;
  subject: string;
  subjectId?: string;
  tutorName: string;
  studentName?: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  status: string;
  attendance?: string;
  zoomLink: string;
  notes?: string;
  recurring?: boolean;
  materialsUrl?: string[];
}

export type ExportFormat = 'csv' | 'pdf';
