
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState<string>('analytics');
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboard.adminDashboard')}</h2>

      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value);
        }}
        className="w-full"
      >
        <TabsList className="grid grid-cols-7 mb-6">
          <TabsTrigger value="analytics">{t('navigation.analytics')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('navigation.classLogs')}</TabsTrigger>
          <TabsTrigger value="payments">{t('navigation.payments')}</TabsTrigger>
          <TabsTrigger value="tutors">{t('navigation.tutors')}</TabsTrigger>
          <TabsTrigger value="students">{t('navigation.students')}</TabsTrigger>
          <TabsTrigger value="relationships">{t('navigation.relationships')}</TabsTrigger>
          <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <ClassAnalytics />
          </Suspense>
        </TabsContent>

        <TabsContent value="schedule" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <ClassLogs />
          </Suspense>
        </TabsContent>

        <TabsContent value="payments" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <PaymentsManager />
          </Suspense>
        </TabsContent>

        <TabsContent value="tutors" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <TutorsManager onSelect={handleTutorSelect} />
          </Suspense>
        </TabsContent>

        <TabsContent value="students" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <StudentsManager onSelect={handleStudentSelect} />
          </Suspense>
        </TabsContent>

        <TabsContent value="relationships" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <RelationshipManager
              relationships={relationships}
              tutors={tutors}
              students={students}
              onRelationshipChange={handleRelationshipChange}
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="settings" className="pt-2">
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSettings />
          </Suspense>
        </TabsContent>
      </Tabs>
      
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

export default AdminDashboard;
