
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockStudents } from "./mock-data-students";
import StudentList from "./StudentList";
import StudentDetailsDialog from "./StudentDetailsDialog";
import { 
  Student, 
  StudentMessage, 
  StudentNote, 
  StudentMessageCollection, 
  StudentNoteCollection 
} from "@/types/sharedTypes";

// Create mock messages and notes directly in this file
const mockMessages: StudentMessageCollection[] = [
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
      }
    ]
  }
];

const mockNotes: StudentNoteCollection[] = [
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
      }
    ]
  }
];

const TutorStudents: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Find messages and notes for selected student
  const studentMessages = mockMessages.find(m => m.studentId === selectedStudent?.id)?.messages || [];
  const studentNotes = mockNotes.find(n => n.studentId === selectedStudent?.id)?.notes || [];
  
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
    setActiveTab("overview");
  };
  
  const handleSendMessage = (message: string) => {
    // In a real app, this would send to a backend
    console.log("Sending message to student:", selectedStudent?.id, message);
  };
  
  const handleAddNote = (title: string, content: string) => {
    // In a real app, this would save to a database
    console.log("Adding note for student:", selectedStudent?.id, { title, content });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Students</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentList 
            students={mockStudents} 
            onSelectStudent={handleStudentSelect} 
          />
        </CardContent>
      </Card>
      
      {/* Student Details Dialog */}
      <StudentDetailsDialog 
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        student={selectedStudent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        studentMessages={studentMessages}
        studentNotes={studentNotes}
        onSendMessage={handleSendMessage}
        onAddNote={handleAddNote}
      />
    </div>
  );
};

export default TutorStudents;
