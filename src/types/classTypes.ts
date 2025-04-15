export interface StudentMessage {
  id: number;
  classId: number;
  content: string;
  isRead: boolean;
  timestamp: string;
  studentId: number;
}

export interface StudentUpload {
  id: string;
  classId: string;
  studentName: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  note: string | null;
}

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