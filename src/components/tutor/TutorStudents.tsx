
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentList from './StudentList';
import StudentListSkeleton from './StudentListSkeleton';
import StudentDetailsDialog from './StudentDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAssignmentsForTutor } from '@/services/assignments/fetch';
import { fetchStudents } from '@/services/students/studentService';
import type { Student } from '@/types/sharedTypes';
import type { TutorStudentAssignment } from '@/services/assignments/types';

const TutorStudents: React.FC = () => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [assignments, setAssignments] = useState<TutorStudentAssignment[]>([]);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        // 1. Load active pairings for this tutor
        const assignments = await fetchAssignmentsForTutor(user.id);
        setAssignments(assignments);
        
        // 2. Load all student profiles and filter to just your students
        const studentsResponse = await fetchStudents();
        const studentIds = assignments.map((assignment: TutorStudentAssignment) => assignment.student_id);
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
