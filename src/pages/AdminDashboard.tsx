
import React, { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, Tutor } from '@/types/tutorTypes';
import { TutorStudentAssignment } from '@/services/assignments/assignmentService';
import { fetchTutorsWithProfileIds, fetchStudentsWithProfileIds } from '@/services/assignments/fetchService';
import { AdminDashboardSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { ContentTransition } from '@/components/shared/PageTransition';

// Dynamically import heavy components
const ClassLogs = lazy(() => import('@/components/admin/ClassLogs'));
const TutorsManager = lazy(() => import('@/components/admin/TutorsManager'));
const StudentsManager = lazy(() => import('@/components/admin/StudentsManager'));
const AssignmentManager = lazy(() => import('@/components/admin/AssignmentManager'));
const AdminSettings = lazy(() => import('@/pages/AdminSettings'));
const ManualCreditAllocation = lazy(() => import('@/components/admin/ManualCreditAllocation').then(m => ({ default: m.ManualCreditAllocation })));
const QuarterlyReports = lazy(() => import('@/components/admin/QuarterlyReports'));

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
  const activeTab = searchParams.get('tab') || 'schedule';
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
      case 'schedule':
        return (
          <Suspense fallback={<TableSkeleton rows={8} columns={7} />}>
            <ClassLogs />
          </Suspense>
        );
      case 'tutors':
        return (
          <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
            <TutorsManager onSelect={handleTutorSelect} />
          </Suspense>
        );
      case 'students':
        return (
          <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
            <StudentsManager onSelect={handleStudentSelect} />
          </Suspense>
        );
      case 'assignments':
        return (
          <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
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
          <Suspense fallback={<AdminDashboardSkeleton />}>
            <AdminSettings />
          </Suspense>
        );
      case 'credits':
        return (
          <Suspense fallback={<TableSkeleton rows={3} columns={3} />}>
            <ManualCreditAllocation />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<TableSkeleton rows={4} columns={4} />}>
            <QuarterlyReports />
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
      
      <ContentTransition transitionKey={activeTab}>
        {renderContent()}
      </ContentTransition>
      
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

export default AdminDashboard;
