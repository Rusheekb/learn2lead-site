
import { StudentMessage, StudentUpload } from "./StudentContent";

// Mock student uploads
export const mockStudentUploads: StudentUpload[] = [
  {
    id: "1",
    classId: "1",
    studentName: "Alex Johnson",
    fileName: "Algebra-Homework-Week3.pdf",
    fileSize: "1.2 MB",
    uploadDate: "2025-04-05",
    note: "I've completed problems 1-8 but I'm stuck on problem 9."
  },
  {
    id: "2",
    classId: "2",
    studentName: "Jamie Smith",
    fileName: "Chemistry-Lab-Report.docx",
    fileSize: "850 KB",
    uploadDate: "2025-04-06",
    note: "Here's my lab report for review before submission."
  },
  {
    id: "3",
    classId: "1",
    studentName: "Alex Johnson",
    fileName: "Quadratics-Practice.pdf",
    fileSize: "540 KB",
    uploadDate: "2025-04-07"
  }
];

// Mock student messages
export const mockStudentMessages: StudentMessage[] = [
  {
    id: "1",
    classId: "1",
    studentName: "Alex Johnson",
    message: "I'm having trouble understanding how to factor trinomials. Could we focus on that in our next session?",
    timestamp: "2025-04-06 15:32",
    isRead: true
  },
  {
    id: "2",
    classId: "2",
    studentName: "Jamie Smith",
    message: "I won't be able to attend our scheduled session next week. Can we reschedule to Friday instead?",
    timestamp: "2025-04-07 09:14",
    isRead: false
  },
  {
    id: "3",
    classId: "4",
    studentName: "Taylor Brown",
    message: "I've started working on the essay outline you suggested. Could you look at what I have so far?",
    timestamp: "2025-04-08 11:45",
    isRead: false
  }
];
