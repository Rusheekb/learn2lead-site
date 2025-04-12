import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import UpcomingClassesTable from "../student/UpcomingClassesTable";
import ClassDetailsDialog from "../student/ClassDetailsDialog";
import { StudentUpload, StudentMessage } from "../shared/StudentContent";
import { supabase } from "@/integrations/supabase/client";
import { fetchClassLogs } from "@/services/classLogsService";
import { 
  fetchClassMessages, 
  createClassMessage 
} from "@/services/classMessagesService";
import { 
  fetchClassUploads, 
  uploadClassFile 
} from "@/services/classUploadsService";

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
  
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      try {
        const classLogs = await fetchClassLogs();
        
        const transformedClasses: ClassItem[] = classLogs.map(cl => ({
          id: cl.id,
          title: cl.title,
          subject: cl.subject,
          tutorName: "Ms. Johnson",
          date: cl.date.toISOString().split('T')[0],
          startTime: cl.startTime,
          endTime: cl.endTime,
          status: "upcoming",
          attendance: "pending",
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

  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedClass) return;
      
      try {
        const classId = selectedClass.id.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
        
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading class content:", error);
      }
    };
    
    loadClassContent();
  }, [selectedClass]);
  
  const handleFileUpload = async (classId: number, file: File, note: string) => {
    try {
      const dbClassId = classId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const upload = await uploadClassFile(
        dbClassId,
        "Current Student",
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
  
  const handleSendMessage = async (classId: number, messageText: string) => {
    try {
      const dbClassId = classId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const message = await createClassMessage(
        dbClassId,
        "Current Student",
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
