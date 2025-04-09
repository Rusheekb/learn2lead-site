
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import UpcomingClassesTable from "../student/UpcomingClassesTable";
import ClassDetailsDialog from "../student/ClassDetailsDialog";
import { mockClasses } from "../student/mock-data";
import { mockStudentMessages, mockStudentUploads } from "../shared/mock-data";
import { StudentUpload, StudentMessage } from "../shared/StudentContent";

const ClassStudentActivity: React.FC = () => {
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>(mockStudentUploads);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>(mockStudentMessages);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  
  // Handle file upload
  const handleFileUpload = (classId: number, file: File, note: string) => {
    // In a real app, this would upload to a server
    const newUpload: StudentUpload = {
      id: studentUploads.length + 1,
      classId,
      studentName: "Current Student", // In a real app, this would be the logged-in user
      fileName: file.name,
      fileSize: `${Math.round(file.size / 1024)} KB`,
      uploadDate: new Date().toISOString().split('T')[0],
      note: note || undefined
    };
    
    setStudentUploads([...studentUploads, newUpload]);
    toast.success("File uploaded successfully");
  };
  
  // Handle sending a message
  const handleSendMessage = (classId: number, messageText: string) => {
    // In a real app, this would send to a backend
    const newMessage: StudentMessage = {
      id: studentMessages.length + 1,
      classId,
      studentName: "Current Student", // In a real app, this would be the logged-in user
      message: messageText,
      timestamp: new Date().toLocaleString(),
      isRead: false
    };
    
    setStudentMessages([...studentMessages, newMessage]);
    toast.success("Message sent successfully");
  };
  
  // Handle viewing class details
  const handleViewClass = (cls: any) => {
    setSelectedClass(cls);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Upcoming Classes</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingClassesTable 
            classes={mockClasses} 
            onViewClass={handleViewClass} 
          />
        </CardContent>
      </Card>
      
      {/* Class Details Dialog */}
      <ClassDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        selectedClass={selectedClass}
        studentUploads={studentUploads}
        studentMessages={studentMessages}
        onFileUpload={handleFileUpload}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ClassStudentActivity;
