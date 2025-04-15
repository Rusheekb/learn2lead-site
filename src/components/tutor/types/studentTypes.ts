
export interface Student {
  id: string; // Changed from number to string
  name: string;
  subjects: string[];
  email: string;
  lastSession: string;
  nextSession: string;
  progress: string;
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

export interface Material {
  id: string; // Changed from number to string
  name: string;
  type: string;
  subject: string;
  dateUploaded: string;
  uploadDate?: string;
  size: string; // Required field from error
  sharedWith: string[];
}
