
import { Student } from "@/types/tutorTypes";

// Mock student data
export const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alex Johnson",
    subjects: ["Algebra", "Calculus", "Physics"]
  },
  {
    id: "2",
    name: "Jamie Smith",
    subjects: ["Chemistry", "Biology"]
  },
  {
    id: "3",
    name: "Taylor Brown",
    subjects: ["English Literature", "Essay Writing", "History"]
  }
];

// Mock student messages data
export interface StudentMessageCollection {
  studentId: string;
  messages: {
    id: string;
    content: string;
    timestamp: string;
    read: boolean;
  }[];
}

export const mockMessages: StudentMessageCollection[] = [
  {
    studentId: "1",
    messages: [
      {
        id: "1",
        content: "Hi, I have a question about the homework problems for calculus.",
        timestamp: "2025-04-01T14:30:00",
        read: true
      },
      {
        id: "2",
        content: "I'm not sure how to approach problem #8 on differentiation.",
        timestamp: "2025-04-01T14:35:00",
        read: true
      },
      {
        id: "3",
        content: "Thanks for the help! I understand it now.",
        timestamp: "2025-04-02T10:15:00",
        read: false
      }
    ]
  },
  {
    studentId: "2",
    messages: [
      {
        id: "1",
        content: "Could we go over the chemical reactions from last class?",
        timestamp: "2025-04-03T09:45:00",
        read: true
      }
    ]
  },
  {
    studentId: "3",
    messages: [
      {
        id: "1",
        content: "I've completed my essay draft. When would be a good time to review it?",
        timestamp: "2025-04-04T16:20:00",
        read: false
      }
    ]
  }
];

// Mock student notes data
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

export const mockNotes: StudentNoteCollection[] = [
  {
    studentId: "1",
    notes: [
      {
        id: "1",
        title: "Algebra Progress",
        content: "Alex is showing good progress with factoring quadratics. Need to focus more on complex fractions.",
        date: "2025-03-15"
      },
      {
        id: "2",
        title: "Calculus Concerns",
        content: "Struggling with the derivative chain rule. Provided additional practice problems.",
        date: "2025-03-22"
      }
    ]
  },
  {
    studentId: "2",
    notes: [
      {
        id: "1",
        title: "Chemistry Lab Preparation",
        content: "Jamie needs to review safety protocols before the next lab session.",
        date: "2025-03-18"
      }
    ]
  },
  {
    studentId: "3",
    notes: [
      {
        id: "1",
        title: "Essay Structure",
        content: "Taylor's thesis statements are strong, but needs work on paragraph transitions.",
        date: "2025-03-25"
      },
      {
        id: "2", 
        title: "Reading Comprehension",
        content: "Excellent analysis of symbolic elements in the novel. Continue with this approach.",
        date: "2025-04-01"
      }
    ]
  }
];

// Mock materials data for the materials tab
export const mockMaterials = [
  {
    id: "1",
    name: "Algebra Fundamentals",
    type: "PDF",
    subject: "Algebra",
    uploadDate: "2025-03-10",
    size: "2.4 MB",
    sharedWith: ["Alex Johnson"]
  },
  {
    id: "2",
    name: "Chemical Reactions Worksheet",
    type: "DOCX",
    subject: "Chemistry",
    uploadDate: "2025-03-15",
    size: "850 KB",
    sharedWith: ["Jamie Smith"]
  },
  {
    id: "3",
    name: "Essay Writing Guide",
    type: "PDF",
    subject: "English",
    uploadDate: "2025-03-20",
    size: "1.2 MB",
    sharedWith: ["Taylor Brown"]
  },
  {
    id: "4",
    name: "Calculus Practice Problems",
    type: "PDF",
    subject: "Calculus",
    uploadDate: "2025-03-25",
    size: "1.5 MB",
    sharedWith: ["Alex Johnson"]
  },
  {
    id: "5",
    name: "Literary Analysis Framework",
    type: "DOCX",
    subject: "English Literature",
    uploadDate: "2025-04-01",
    size: "720 KB",
    sharedWith: ["Taylor Brown"]
  }
];
