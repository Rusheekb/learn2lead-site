
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import TutorScheduler from '@/components/tutor/TutorScheduler';
import TutorStudents from '@/components/tutor/TutorStudents';
import TutorMaterials from '@/components/tutor/TutorMaterials';
import ProfilePage from '@/components/shared/ProfilePage';
import TutorOverviewSection from '@/components/tutor/dashboard/TutorOverviewSection';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const TutorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { userRole } = useAuth();

  // Redirect if not a tutor
  if (userRole && userRole !== 'tutor') {
    switch (userRole) {
      case 'student':
        return <Navigate to="/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      default:
        return null;
    }
  }

  return (
    <DashboardLayout title="Tutor Portal" role="tutor">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Tutor Dashboard</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-6 bg-white dark:bg-gray-800 dark:text-gray-100">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-2">
            <TutorOverviewSection />
          </TabsContent>

          <TabsContent value="schedule" className="pt-2">
            <TutorScheduler />
          </TabsContent>

          <TabsContent value="students" className="pt-2">
            <TutorStudents />
          </TabsContent>

          <TabsContent value="materials" className="pt-2">
            <TutorMaterials />
          </TabsContent>

          <TabsContent value="profile" className="pt-2">
            <ProfilePage />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TutorDashboard;
