
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ClassAnalytics from '@/components/admin/ClassAnalytics';
import ClassLogs from '@/components/admin/ClassLogs';
import PaymentsManager from '@/components/admin/PaymentsManager';
import TutorsManager from '@/components/admin/TutorsManager';
import StudentsManager from '@/components/admin/StudentsManager';
import RelationshipManager from '@/components/admin/RelationshipManager';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, Tutor } from '@/types/tutorTypes';
import { TutorStudentRelationship } from '@/services/relationships/relationshipService';
import { fetchTutors } from '@/services/tutors/tutorService';
import { fetchStudents } from '@/services/students/studentService';

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
            <ClassAnalytics />
          </TabsContent>

          <TabsContent value="schedule" className="pt-2">
            <ClassLogs />
          </TabsContent>

          <TabsContent value="payments" className="pt-2">
            <PaymentsManager />
          </TabsContent>

          <TabsContent value="tutors" className="pt-2">
            <TutorsManager onSelect={handleTutorSelect} />
          </TabsContent>

          <TabsContent value="students" className="pt-2">
            <StudentsManager onSelect={handleStudentSelect} />
          </TabsContent>

          <TabsContent value="relationships" className="pt-2">
            <RelationshipManager
              relationships={relationships}
              tutors={tutors}
              students={students}
              onRelationshipChange={handleRelationshipChange}
            />
          </TabsContent>
        </Tabs>
      </div>
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </DashboardLayout>
  );
};

export default AdminDashboard;
