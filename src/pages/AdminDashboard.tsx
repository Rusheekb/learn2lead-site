
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { EventName } from '@/services/analytics/analyticsService';

// Dynamically import heavy components
const ClassAnalytics = lazy(() => import('@/components/admin/ClassAnalytics'));
const ClassLogs = lazy(() => import('@/components/admin/ClassLogs'));
const PaymentsManager = lazy(() => import('@/components/admin/PaymentsManager'));
const TutorsManager = lazy(() => import('@/components/admin/TutorsManager'));
const StudentsManager = lazy(() => import('@/components/admin/StudentsManager'));
const AssignmentManager = lazy(() => import('@/components/admin/AssignmentManager'));
const AdminSettings = lazy(() => import('@/pages/AdminSettings'));

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
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'analytics';
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { trackNavigation, trackPageView } = useAnalyticsTracker();

  // Track page view on initial render
  useEffect(() => {
    trackPageView('admin-dashboard');
  }, [trackPageView]);

  // Track tab changes
  useEffect(() => {
    trackNavigation(EventName.TAB_CHANGE, { tab: activeTab, dashboard: 'admin' });
  }, [activeTab, trackNavigation]);

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
          <Suspense fallback={<LoadingSpinner />}>
            <ClassAnalytics />
          </Suspense>
        );
      case 'schedule':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ClassLogs />
          </Suspense>
        );
      case 'payments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PaymentsManager />
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
      default:
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ClassAnalytics />
          </Suspense>
        );
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboard.adminDashboard')}</h2>
      
      {renderContent()}
      
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

export default AdminDashboard;
