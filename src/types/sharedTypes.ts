// Common types used across multiple components

export interface Student {
  id: string;
  name: string;
  subjects: string[];
  email?: string;
  lastSession?: string;
  nextSession?: string;
  progress?: string;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  subject: string;
  dateUploaded: string;
  size: string;
  sharedWith: string[];
  uploadDate?: string;
}

export interface StudentMessage {
  id: string;
  content: string;
  timestamp: string;
  read: boolean;
  sender?: "tutor" | "student";
  text?: string;
}

export interface StudentNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface StudentMessageCollection {
  studentId: string;
  messages: StudentMessage[];
}

export interface StudentNoteCollection {
  studentId: string;
  notes: StudentNote[];
}

export interface ClassSession {
  id: string;
  title: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  subject: string;
  tutorName?: string;
  studentName?: string;
  status: "upcoming" | "completed" | "cancelled";
  attendance?: "present" | "absent" | "late" | "excused" | "pending";
}

export type ExportFormat = 'csv' | 'pdf';

export interface TopPerformer {
  name: string;
  value: number;
}

export interface PopularSubject {
  subject: string;
  count: number;
}

export interface ContentShareItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  content_type: string | null;
  shared_at: string;
  viewed_at: string | null;
}
