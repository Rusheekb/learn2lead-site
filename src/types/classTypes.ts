
// Import the types from StudentContent to ensure consistency
import { StudentMessage as SharedStudentMessage, StudentUpload as SharedStudentUpload } from "@/components/shared/StudentContent";

// Re-export the types from StudentContent
export type StudentMessage = SharedStudentMessage;
export type StudentUpload = SharedStudentUpload;

export interface ClassTab {
  id: string;
  label: string;
  value: string;
}

export type ExportFormat = 'csv' | 'pdf';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface ClassDetailsState {
  isOpen: boolean;
  selectedClass: any | null;
  activeTab: string;
  uploads: StudentUpload[];
  messages: StudentMessage[];
} 

export interface ClassItem {
  id: string;
  title: string;
  subject: string;
  tutorName: string;
  studentName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  attendance: string;
  zoomLink: string;
  notes: string;
  subjectId?: string;
  recurring?: boolean;
}

export interface ClassSession {
  id: string;
  title: string;
  subjectId: string | number;
  tutorName: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  zoomLink: string;
  recurring: boolean;
  recurringDays?: string[];
  studentName?: string;
}
