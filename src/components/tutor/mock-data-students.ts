
import { Student, StudentMessages, StudentNotes } from "./types/studentTypes";

// Mock student data with messages and notes
export const mockStudents: Student[] = [
  { 
    id: 1, 
    name: "Alex Johnson", 
    email: "alex@example.com",
    subjects: ["Mathematics", "Physics"],
    progress: "Good progress in algebra, needs help with calculus",
    lastSession: "2025-04-01",
    nextSession: "2025-04-08"
  },
  { 
    id: 2, 
    name: "Jamie Smith", 
    email: "jamie@example.com",
    subjects: ["Chemistry", "Biology"],
    progress: "Excellent understanding of molecular structures",
    lastSession: "2025-04-03",
    nextSession: "2025-04-10"
  },
  { 
    id: 3, 
    name: "Taylor Brown", 
    email: "taylor@example.com",
    subjects: ["English", "History"],
    progress: "Working on essay structure and analysis",
    lastSession: "2025-04-06",
    nextSession: "2025-04-13"
  }
];

// Mock messages between tutor and students
export const mockMessages: StudentMessages[] = [
  {
    studentId: 1,
    messages: [
      { id: 1, sender: "student", text: "Hi, I'm having trouble with the homework problems 3-5.", timestamp: "2025-04-02T14:30:00" },
      { id: 2, sender: "tutor", text: "Let's go over them in our next session. Could you send me your work so far?", timestamp: "2025-04-02T15:05:00" },
      { id: 3, sender: "student", text: "Attached is what I've done so far. I'm stuck on problem 4.", timestamp: "2025-04-02T16:22:00" }
    ]
  },
  {
    studentId: 2,
    messages: [
      { id: 1, sender: "student", text: "When will we cover the periodic table?", timestamp: "2025-04-03T09:15:00" },
      { id: 2, sender: "tutor", text: "We'll cover that in our next session on Thursday. Please review chapter 4 beforehand.", timestamp: "2025-04-03T10:30:00" }
    ]
  },
  {
    studentId: 3,
    messages: [
      { id: 1, sender: "student", text: "I've revised my essay based on your feedback. Could you take a look?", timestamp: "2025-04-04T12:00:00" },
      { id: 2, sender: "tutor", text: "I'll review it tonight and provide feedback by tomorrow morning.", timestamp: "2025-04-04T13:45:00" },
      { id: 3, sender: "tutor", text: "Your revised essay is much improved! I've added a few more suggestions in the document.", timestamp: "2025-04-05T08:30:00" }
    ]
  }
];

// Mock notes about students
export const mockNotes: StudentNotes[] = [
  {
    studentId: 1,
    notes: [
      { id: 1, title: "Initial Assessment", content: "Strong foundation in basic algebra but struggles with word problems. Visual learning approach works best.", date: "2025-03-15" },
      { id: 2, title: "Progress Report - Q1", content: "Significant improvement in problem-solving. Still needs work on applications of derivatives.", date: "2025-04-01" }
    ]
  },
  {
    studentId: 2,
    notes: [
      { id: 1, title: "Learning Style", content: "Prefers hands-on experiments and practical applications. Excellent at memorization but needs help connecting concepts.", date: "2025-03-10" }
    ]
  },
  {
    studentId: 3,
    notes: [
      { id: 1, title: "Writing Assessment", content: "Strong vocabulary but struggling with essay structure and thesis development.", date: "2025-03-20" },
      { id: 2, title: "Progress - April", content: "Essays showing improved organization. Next focus: strengthening analytical arguments.", date: "2025-04-05" }
    ]
  }
];
