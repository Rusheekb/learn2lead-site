
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentList from './StudentList';
import StudentListSkeleton from './StudentListSkeleton';
import StudentDetailsDialog from './StudentDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTutorStudentsByEmail, TutorStudentData } from '@/services/tutors/tutorStudentsService';
import type { Student } from '@/types/sharedTypes';

const TutorStudents: React.FC = () => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        // Use the new email-based function to fetch tutor students
        const tutorStudents = await fetchTutorStudentsByEmail();
        
        // Transform the data to match the Student interface
        const transformedStudents: Student[] = tutorStudents.map((ts: TutorStudentData) => ({
          id: ts.student_id,
          name: ts.student_name,
          email: ts.student_email,
          subjects: ts.subjects || [],
          grade: ts.grade || 'Not specified',
          paymentStatus: ts.payment_status || 'paid',
          nextSession: undefined // Will be populated if needed
        }));
        
        setMyStudents(transformedStudents);
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
      />
    </div>
  );
};

export default TutorStudents;
