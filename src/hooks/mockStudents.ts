
import { Student } from "@/types/tutorTypes";

export const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alex Johnson",
    email: "alex@example.com",
    subjects: ["Math", "Science"],
    lastSession: "2023-03-15",
    nextSession: "2023-03-22",
    progress: "Making good progress with fractions"
  },
  {
    id: "2",
    name: "Sam Taylor",
    email: "sam@example.com",
    subjects: ["English", "History"],
    lastSession: "2023-03-16",
    nextSession: "2023-03-23",
    progress: "Working on essay structure"
  },
  {
    id: "3",
    name: "Jordan Smith",
    email: "jordan@example.com",
    subjects: ["Chemistry", "Physics"],
    lastSession: "2023-03-14",
    nextSession: "2023-03-21",
    progress: "Struggling with balancing equations"
  },
  {
    id: "4",
    name: "Morgan Lee",
    email: "morgan@example.com",
    subjects: ["Spanish", "French"],
    lastSession: "2023-03-17",
    nextSession: "2023-03-24", 
    progress: "Vocabulary improving, working on grammar"
  }
];
