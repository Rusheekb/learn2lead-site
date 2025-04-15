
import { Material, Student, StudentMessage, StudentMessageCollection, StudentNote, StudentNoteCollection } from "@/types/sharedTypes";

// Mock materials data
export const mockMaterials: Material[] = [
  {
    id: "1",
    name: "Algebra Fundamentals",
    type: "PDF",
    subject: "Algebra",
    dateUploaded: "2023-04-01",
    uploadDate: "2023-04-01",
    size: "2.4 MB",
    sharedWith: ["Alex Johnson", "Morgan Lee"]
  },
  {
    id: "2",
    name: "Chemistry Lab Procedures",
    type: "DOCX",
    subject: "Chemistry",
    dateUploaded: "2023-04-05",
    uploadDate: "2023-04-05",
    size: "1.8 MB",
    sharedWith: ["Jamie Smith"]
  },
  {
    id: "3",
    name: "Essay Writing Guide",
    type: "PDF",
    subject: "English Literature",
    dateUploaded: "2023-04-10",
    uploadDate: "2023-04-10",
    size: "3.2 MB",
    sharedWith: ["Taylor Brown"]
  },
  {
    id: "4",
    name: "Spanish Vocabulary List",
    type: "PDF",
    subject: "Spanish",
    dateUploaded: "2023-04-15",
    uploadDate: "2023-04-15",
    size: "1.2 MB",
    sharedWith: ["Morgan Lee"]
  }
];

// Mock student data
export const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    subjects: ["Algebra", "Calculus", "Physics"],
    lastSession: "2023-04-10",
    nextSession: "2023-04-17",
    progress: "Making good progress in Algebra. Needs more work on Calculus integrals."
  },
  {
    id: "2",
    name: "Jamie Smith",
    email: "jamie@example.com",
    subjects: ["Chemistry", "Biology"],
    lastSession: "2023-04-12",
    nextSession: "2023-04-19",
    progress: "Excellent understanding of molecular biology. Working on chemistry formulas."
  },
  {
    id: "3",
    name: "Taylor Brown",
    email: "taylor@example.com",
    subjects: ["English Literature", "Essay Writing", "History"],
    lastSession: "2023-04-11",
    nextSession: "2023-04-18",
    progress: "Essay structure has improved. Currently working on thesis development."
  },
  {
    id: "4",
    name: "Morgan Lee",
    email: "morgan@example.com",
    subjects: ["Spanish", "French", "ESL"],
    lastSession: "2023-04-13",
    nextSession: "2023-04-20",
    progress: "Conversational Spanish is improving. Need to focus on verb conjugations."
  }
];

// Mock messages for students
export const mockMessages: StudentMessageCollection[] = [
  {
    studentId: "1",
    messages: [
      {
        id: "1",
        content: "Do we need to bring the textbook to our next session?",
        timestamp: "2023-04-10T14:30:00Z",
        read: true,
        sender: "student",
        text: "Do we need to bring the textbook to our next session?"
      },
      {
        id: "2",
        content: "Yes, please bring your textbook. We'll be working on chapter 4.",
        timestamp: "2023-04-10T15:00:00Z",
        read: true,
        sender: "tutor",
        text: "Yes, please bring your textbook. We'll be working on chapter 4."
      },
      {
        id: "3",
        content: "I've completed the homework assignments. Can we review them?",
        timestamp: "2023-04-11T09:15:00Z",
        read: false,
        sender: "student",
        text: "I've completed the homework assignments. Can we review them?"
      }
    ]
  }
];

// Mock notes for students
export const mockNotes: StudentNoteCollection[] = [
  {
    studentId: "1",
    notes: [
      {
        id: "1",
        title: "First Session Notes",
        content: "Initial assessment complete. Student shows strong aptitude for algebra but needs work on geometry concepts.",
        date: "2023-03-15"
      },
      {
        id: "2",
        title: "Homework Review",
        content: "Reviewed chapter 3 homework. Most problems correct, but struggling with word problems.",
        date: "2023-03-22"
      },
      {
        id: "3",
        title: "Test Preparation",
        content: "Focused on test-taking strategies. Created study guide for upcoming exam.",
        date: "2023-04-05"
      }
    ]
  }
];
