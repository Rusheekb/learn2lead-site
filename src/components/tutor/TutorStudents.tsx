
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "./types/studentTypes";
import { mockStudents, mockMessages, mockNotes } from "./mock-data-students";
import StudentList from "./StudentList";
import StudentDetailsDialog from "./StudentDetailsDialog";

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
