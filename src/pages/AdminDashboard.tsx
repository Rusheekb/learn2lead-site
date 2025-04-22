import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ClassAnalytics from '@/components/admin/ClassAnalytics';
import ClassLogs from '@/components/admin/ClassLogs';
import PaymentsManager from '@/components/admin/PaymentsManager';
import TutorsManager from '@/components/admin/TutorsManager';
import StudentsManager from '@/components/admin/StudentsManager';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('analytics');

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
            <TutorsManager />
          </TabsContent>

          <TabsContent value="students" className="pt-2">
            <StudentsManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
