
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudentList from "./StudentList";
import StudentDetailsDialog from "./StudentDetailsDialog";
import { StudentMessage, StudentNote } from "@/types/sharedTypes";
import { fetchTutorStudents } from "@/services/tutorService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for the component
interface TutorStudent {
  student_id: string;
  student_name: string;
  grade: string;
  subjects: string[];
  payment_status: string;
}

const TutorStudents: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [students, setStudents] = useState<any[]>([]);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Get current user and fetch their tutor profile
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is a tutor
        const { data, error } = await supabase
          .from('tutors')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
          
        if (data?.id) {
          setTutorId(data.id);
        } else {
          console.log('User is not a registered tutor');
        }
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // Load tutor's students when tutorId is available
  useEffect(() => {
    if (!tutorId) return;
    
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        const tutorStudents = await fetchTutorStudents(tutorId);
        
        const formattedStudents = tutorStudents.map(ts => ({
          id: ts.student_id,
          name: ts.student_name,
          subjects: ts.subjects || [],
          grade: ts.grade || '',
          lastSession: '', // Will be populated from class data
          nextSession: '', // Will be populated from class data
          progress: ts.payment_status || 'active'
        }));
        
        setStudents(formattedStudents);
      } catch (error) {
        console.error("Error loading students:", error);
        toast.error("Failed to load students");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStudents();
  }, [tutorId]);
  
  // Find messages and notes for selected student - empty arrays for now
  const studentMessages: StudentMessage[] = [];
  const studentNotes: StudentNote[] = [];
  
  const handleStudentSelect = (student: any) => {
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
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p>Loading students...</p>
            </div>
          ) : students.length > 0 ? (
            <StudentList 
              students={students} 
              onSelectStudent={handleStudentSelect} 
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No students are currently assigned to you.</p>
              <p className="mt-2 text-sm">Students will be assigned by an administrator.</p>
            </div>
          )}
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
