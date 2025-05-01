
import React, { useState, Suspense, lazy } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, Tutor } from '@/types/tutorTypes';
import { TutorStudentRelationship } from '@/services/relationships/relationshipService';
import { fetchTutors } from '@/services/tutors/tutorService';
import { fetchStudents } from '@/services/students/studentService';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Dynamically import heavy components
const ClassAnalytics = lazy(() => import('@/components/admin/ClassAnalytics'));
const ClassLogs = lazy(() => import('@/components/admin/ClassLogs'));
const PaymentsManager = lazy(() => import('@/components/admin/PaymentsManager'));
const TutorsManager = lazy(() => import('@/components/admin/TutorsManager'));
const StudentsManager = lazy(() => import('@/components/admin/StudentsManager'));
const RelationshipManager = lazy(() => import('@/components/admin/RelationshipManager'));

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
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
    <DashboardLayout title="Admin Portal" role="admin">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 mb-6">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="schedule">Class Logs</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="tutors">Tutors</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
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
        </Tabs>
      </div>
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </DashboardLayout>
  );
};

export default AdminDashboard;
