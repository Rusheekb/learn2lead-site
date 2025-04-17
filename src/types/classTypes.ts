
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
}

export interface StudentMessage {
  id: string;
  content: string;
  timestamp: string;
  read: boolean;
  sender: "student" | "tutor";
  text: string;
}

export interface StudentUpload {
  id: string;
  fileName: string;
  uploadDate: string;
  fileSize: string;
  uploadPath: string;
}
