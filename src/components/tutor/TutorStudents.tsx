import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentList from './StudentList';
import StudentDetailsDialog from './StudentDetailsDialog';
import { StudentMessage, StudentNote } from '@/types/sharedTypes';
import { fetchStudents } from '@/services/students/studentService';
import { fetchRelationshipsForTutor } from '@/services/relationships/fetch';
import { useAuth } from '@/contexts/AuthContext';

const TutorStudents: React.FC = () => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        // 1. Load active pairings for this tutor
        const rels = await fetchRelationshipsForTutor(user.id);
        
        // 2. Load all student profiles and filter to just your students
        const allStudents = await fetchStudents();
        const studentIds = rels.map(r => r.student_id);
        const myStudents = allStudents.filter(s => studentIds.includes(s.id));
        
        setStudents(myStudents);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [user]);

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
    setActiveTab('overview');
  };

  const handleSendMessage = (message: string) => {
    // In a real app, this would send to a backend
    console.log('Sending message to student:', selectedStudent?.id, message);
  };

  const handleAddNote = (title: string, content: string) => {
    // In a real app, this would save to a database
    console.log('Adding note for student:', selectedStudent?.id, {
      title,
      content,
    });
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
              <p className="mt-2 text-sm">
                Students will be assigned by an administrator.
              </p>
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
        studentMessages={[]} // We'll implement these later
        studentNotes={[]}    // We'll implement these later
        onSendMessage={handleSendMessage}
        onAddNote={handleAddNote}
      />
    </div>
  );
};

export default TutorStudents;
