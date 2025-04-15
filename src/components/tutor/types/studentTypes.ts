
export interface Student {
  id: string;
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
  studentId: string;
  messages: StudentMessage[];
}

export interface StudentNotes {
  studentId: string;
  notes: StudentNote[];
}
