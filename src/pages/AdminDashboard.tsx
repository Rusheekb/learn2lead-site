
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, Tutor } from '@/types/tutorTypes';
import { TutorStudentAssignment } from '@/services/assignments/assignmentService';
import { fetchTutors } from '@/services/tutors/tutorService';
import { fetchStudents } from '@/services/students/studentService';
import { fetchTutorsWithProfileIds, fetchStudentsWithProfileIds, TutorWithProfileId, StudentWithProfileId } from '@/services/assignments/fetchService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
// Dynamically import heavy components
const ClassLogs = lazy(() => import('@/components/admin/ClassLogs'));
const TutorsManager = lazy(() => import('@/components/admin/TutorsManager'));
const StudentsManager = lazy(() => import('@/components/admin/StudentsManager'));
const AssignmentManager = lazy(() => import('@/components/admin/AssignmentManager'));
const AdminSettings = lazy(() => import('@/pages/AdminSettings'));
const ManualCreditAllocation = lazy(() => import('@/components/admin/ManualCreditAllocation').then(m => ({ default: m.ManualCreditAllocation })));

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

const fetchAssignments = async () => {
  const { data, error } = await supabase
    .from('tutor_student_assigned')
    .select('*')
    .eq('active', true);

  if (error) {
    throw error;
  }

  return data as TutorStudentAssignment[];
};

const AdminDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'analytics';
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { 
    data: assignments = [], 
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: ['assignments'],
    queryFn: fetchAssignments,
  });
  
  // Fetch tutors with profile IDs for the AssignmentManager
  const { 
    data: tutorsWithProfileIds = []
  } = useQuery({
    queryKey: ['tutors-with-profile-ids'],
    queryFn: fetchTutorsWithProfileIds,
  });
  
  // Fetch students with profile IDs for the AssignmentManager
  const { 
    data: studentsWithProfileIds = []
  } = useQuery({
    queryKey: ['students-with-profile-ids'],
    queryFn: fetchStudentsWithProfileIds,
  });

  const handleAssignmentChange = () => {
    refetchAssignments();
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedUser({ ...student, role: 'student' });
  };

  const handleTutorSelect = (tutor: Tutor) => {
    setSelectedUser({ ...tutor, role: 'tutor' });
  };

  // Render the appropriate content based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Analytics Overview</h3>
            <p className="text-muted-foreground">Basic analytics coming soon...</p>
          </div>
        );
      case 'schedule':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ClassLogs />
          </Suspense>
        );
      case 'tutors':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <TutorsManager onSelect={handleTutorSelect} />
          </Suspense>
        );
      case 'students':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <StudentsManager onSelect={handleStudentSelect} />
          </Suspense>
        );
      case 'assignments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AssignmentManager
              assignments={assignments}
              tutors={tutorsWithProfileIds}
              students={studentsWithProfileIds}
              onAssignmentChange={handleAssignmentChange}
            />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSettings />
          </Suspense>
        );
      case 'credits':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ManualCreditAllocation />
          </Suspense>
        );
      default:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Analytics Overview</h3>
            <p className="text-muted-foreground">Basic analytics coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      
      {renderContent()}
      
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

export default AdminDashboard;
