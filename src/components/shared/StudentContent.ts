
export interface StudentMessage {
  id: string;
  classId: string;
  studentName: string;
  message: string;
  timestamp: string;
  isRead: boolean;
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
