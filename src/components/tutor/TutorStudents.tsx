
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentList from './StudentList';
import StudentListSkeleton from './StudentListSkeleton';
import StudentDetailsDialog from './StudentDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRelationshipsForTutor } from '@/services/relationships/fetch';
import { fetchStudents } from '@/services/students/studentService';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentRelationship } from '@/services/relationships/types';

const TutorStudents: React.FC = () => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [relationships, setRelationships] = useState<TutorStudentRelationship[]>([]);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        // 1. Load active pairings for this tutor
        const rels = await fetchRelationshipsForTutor(user.id);
        setRelationships(rels);
        
        // 2. Load all student profiles and filter to just your students
        const studentsResponse = await fetchStudents();
        const studentIds = rels.map(r => r.student_id);
        // Extract the data array from the paginated response and filter it
        const filteredStudents = studentsResponse.data.filter((s: Student) => 
          studentIds.includes(s.id)
        );
        
        setMyStudents(filteredStudents);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [user]);

  const handleStudentSelect = (student: Student) => {
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
            <StudentListSkeleton />
          ) : myStudents.length > 0 ? (
            <StudentList
              students={myStudents}
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
