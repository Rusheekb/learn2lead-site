
export interface Student {
  id: number;
  name: string;
  email: string;
  subjects: string[];
  progress: string;
  lastSession: string;
  nextSession: string;
}

export interface StudentMessage {
  id: number;
  sender: "student" | "tutor";
  text: string;
  timestamp: string;
}

export interface StudentNote {
  id: number;
  title: string;
  content: string;
  date: string;
}

export interface StudentMessages {
  studentId: number;
  messages: StudentMessage[];
}

export interface StudentNotes {
  studentId: number;
  notes: StudentNote[];
}
