
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, Tutor } from '@/types/tutorTypes';
import { TutorStudentRelationship } from '@/services/relationships/relationshipService';
import { fetchTutors } from '@/services/tutors/tutorService';
import { fetchStudents } from '@/services/students/studentService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { EventName } from '@/services/analytics/analyticsService';

// Dynamically import heavy components
const ClassAnalytics = lazy(() => import('@/components/admin/ClassAnalytics'));
const ClassLogs = lazy(() => import('@/components/admin/ClassLogs'));
const PaymentsManager = lazy(() => import('@/components/admin/PaymentsManager'));
const TutorsManager = lazy(() => import('@/components/admin/TutorsManager'));
const StudentsManager = lazy(() => import('@/components/admin/StudentsManager'));
const RelationshipManager = lazy(() => import('@/components/admin/RelationshipManager'));
const AdminSettings = lazy(() => import('@/pages/AdminSettings'));

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

const fetchRelationships = async () => {
  const { data, error } = await supabase
    .from('tutor_student_relationships')
    .select('*')
    .eq('active', true);

  if (error) {
    throw error;
  }

  return data as TutorStudentRelationship[];
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
    data: relationships = [], 
    isLoading: isRelationshipsLoading,
    refetch: refetchRelationships
  } = useQuery({
    queryKey: ['relationships'],
    queryFn: fetchRelationships,
  });
  
  // Fetch tutors for the RelationshipManager
  const { 
    data: tutorsResponse
  } = useQuery({
    queryKey: ['tutors', { page: 1, pageSize: 100, search: '' }],
    queryFn: () => fetchTutors({ page: 1, pageSize: 100 }),
  });
  
  const tutors = tutorsResponse?.data || [];
  
  // Fetch students for the RelationshipManager
  const { 
    data: studentsResponse
  } = useQuery({
    queryKey: ['students', { page: 1, pageSize: 100, search: '' }],
    queryFn: () => fetchStudents({ page: 1, pageSize: 100 }),
  });
  
  const students = studentsResponse?.data || [];

  const handleRelationshipChange = () => {
    refetchRelationships();
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
      case 'relationships':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <RelationshipManager
              relationships={relationships}
              tutors={tutors}
              students={students}
              onRelationshipChange={handleRelationshipChange}
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
