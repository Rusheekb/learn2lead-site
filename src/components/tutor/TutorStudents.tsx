import React, { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentList from './StudentList';
import StudentListSkeleton from './StudentListSkeleton';
import StudentDetailsDialog from './StudentDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTutorStudentsByEmail, TutorStudentData } from '@/services/tutors/tutorStudentsService';
import { useQuery } from '@tanstack/react-query';
import type { Student } from '@/types/sharedTypes';

const TutorStudents: React.FC = memo(() => {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data: myStudents = [], isLoading } = useQuery({
    queryKey: ['tutorStudentsList', user?.id],
    queryFn: async () => {
      const tutorStudents = await fetchTutorStudentsByEmail();
      return tutorStudents.map((ts: TutorStudentData): Student => ({
        id: ts.student_id,
        name: ts.student_name,
        email: ts.student_email,
        subjects: ts.subjects || [],
        nextSession: undefined,
      }));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
            <div className="text-center py-8 text-muted-foreground">
              <p>No students are currently assigned to you.</p>
              <p className="mt-2 text-sm">
                Students will be assigned by an administrator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <StudentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        student={selectedStudent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
});

TutorStudents.displayName = 'TutorStudents';

export default TutorStudents;
