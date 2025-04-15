
export interface Student {
  id: string;
  name: string;
  subjects: string[];
}

export interface StudentMessage {
  id: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface StudentMessageCollection {
  studentId: string;
  messages: StudentMessage[];
}

export interface StudentNote {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface StudentNoteCollection {
  studentId: string;
  notes: StudentNote[];
}
