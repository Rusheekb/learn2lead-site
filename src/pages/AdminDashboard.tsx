
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ClassAnalytics from '@/components/admin/ClassAnalytics';
import ClassLogs from '@/components/admin/ClassLogs';
import PaymentsManager from '@/components/admin/PaymentsManager';
import TutorsManager from '@/components/admin/TutorsManager';
import StudentsManager from '@/components/admin/StudentsManager';
import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { useStudentRecordsRealtime } from '@/hooks/realtime/useStudentRecordsRealtime';
import { useTutorRecordsRealtime } from '@/hooks/realtime/useTutorRecordsRealtime';
import { Student, Tutor } from '@/types/tutorTypes';
import { fetchStudents } from '@/services/students/studentService';
import { fetchTutors } from '@/services/tutors/tutorService';

type User = (Student | Tutor) & { role: 'student' | 'tutor' };

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useStudentRecordsRealtime(setStudents);
  useTutorRecordsRealtime(setTutors);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const studentsData = await fetchStudents();
        const tutorsData = await fetchTutors();
        
        console.log('fetched tutors:', tutorsData); // Already present, kept for clarity
        setStudents(studentsData);
        setTutors(tutorsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

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
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="schedule">Class Logs</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="tutors">Tutors</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
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
            <TutorsManager tutors={tutors} onSelect={handleTutorSelect} />
          </TabsContent>

          <TabsContent value="students" className="pt-2">
            <StudentsManager students={students} onSelect={handleStudentSelect} />
          </TabsContent>
        </Tabs>
      </div>
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </DashboardLayout>
  );
};

export default AdminDashboard;
