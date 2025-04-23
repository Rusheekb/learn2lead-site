
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ClassAnalytics from '@/components/admin/ClassAnalytics';
import ClassLogs from '@/components/admin/ClassLogs';
import PaymentsManager from '@/components/admin/PaymentsManager';
import TutorsManager from '@/components/admin/TutorsManager';
import StudentsManager from '@/components/admin/StudentsManager';
import { useStudentRecordsRealtime } from '@/hooks/realtime/useStudentRecordsRealtime';
import { useTutorRecordsRealtime } from '@/hooks/realtime/useTutorRecordsRealtime';
import { Student, Tutor } from '@/types/tutorTypes';
import { fetchStudents } from '@/services/students/studentService';
import { fetchTutors } from '@/services/tutors/tutorService';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);

  // Initialize real-time subscriptions
  useStudentRecordsRealtime(setStudents);
  useTutorRecordsRealtime(setTutors);
  
  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const studentsData = await fetchStudents();
        const tutorsData = await fetchTutors();
        
        setStudents(studentsData);
        setTutors(tutorsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

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
            <TutorsManager tutors={tutors} />
          </TabsContent>

          <TabsContent value="students" className="pt-2">
            <StudentsManager students={students} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
