
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import UpcomingClassesTable from "../student/UpcomingClassesTable";
import ClassDetailsDialog from "../student/ClassDetailsDialog";
import { StudentUpload, StudentMessage } from "../shared/StudentContent";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchClassLogs,
  fetchClassMessages,
  fetchClassUploads,
  createClassMessage,
  uploadClassFile
} from "@/services/classService";

interface ClassItem {
  id: number;
  title: string;
  subject: string;
  tutorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  attendance: string;
  zoomLink: string;
  notes: string;
  studentName: string;
}

const ClassStudentActivity: React.FC = () => {
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch classes on component mount
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      try {
        const classLogs = await fetchClassLogs();
        
        // Transform to the format expected by the component
        const transformedClasses: ClassItem[] = classLogs.map(cl => ({
          id: cl.id,
          title: cl.title,
          subject: cl.subject,
          tutorName: "Ms. Johnson", // This would come from the database in a real app
          date: cl.date.toISOString().split('T')[0],
          startTime: cl.startTime,
          endTime: cl.endTime,
          status: "upcoming", // This would come from the database in a real app
          attendance: "pending", // This would come from the database in a real app
          zoomLink: cl.zoomLink,
          notes: cl.notes || "",
          studentName: cl.studentName
        }));
        
        setClasses(transformedClasses);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Failed to load classes");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClasses();
  }, []);

  // Load messages and uploads when a class is selected
  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedClass) return;
      
      try {
        // Convert numeric ID back to UUID-like string for database query
        const classId = selectedClass.id.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
        
        // Load messages
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        // Load uploads
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading class content:", error);
      }
    };
    
    loadClassContent();
  }, [selectedClass]);
  
  // Handle file upload
  const handleFileUpload = async (classId: number, file: File, note: string) => {
    try {
      // Convert numeric ID back to UUID-like string for database query
      const dbClassId = classId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const upload = await uploadClassFile(
        dbClassId,
        "Current Student", // This would come from auth context in a real app
        file,
        note
      );
      
      if (upload) {
        setStudentUploads([...studentUploads, upload]);
        toast.success("File uploaded successfully");
      } else {
        toast.error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    }
  };
  
  // Handle sending a message
  const handleSendMessage = async (classId: number, messageText: string) => {
    try {
      // Convert numeric ID back to UUID-like string for database query
      const dbClassId = classId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const message = await createClassMessage(
        dbClassId,
        "Current Student", // This would come from auth context in a real app
        messageText
      );
      
      if (message) {
        setStudentMessages([...studentMessages, message]);
        toast.success("Message sent successfully");
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };
  
  // Handle viewing class details
  const handleViewClass = (cls: ClassItem) => {
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
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <p>Loading classes...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No scheduled classes found</p>
            </div>
          ) : (
            <UpcomingClassesTable 
              classes={classes} 
              onViewClass={handleViewClass} 
            />
          )}
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
