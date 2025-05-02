
import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/shared/DashboardLayout';
import TutorScheduler from '@/components/tutor/TutorScheduler';
import TutorStudents from '@/components/tutor/TutorStudents';
import TutorMaterials from '@/components/tutor/TutorMaterials';
import ProfilePage from '@/components/shared/ProfilePage';
import TutorOverviewSection from '@/components/tutor/dashboard/TutorOverviewSection';

const TutorDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
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

  // Determine which content to show based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <TutorOverviewSection />;
      case 'schedule':
        return <TutorScheduler />;
      case 'students':
        return <TutorStudents />;
      case 'resources':
        return <TutorMaterials />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <TutorOverviewSection />;
    }
  };

  return (
    <DashboardLayout title="Tutor Portal" role="tutor">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-gray-100">Tutor Dashboard</h2>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default TutorDashboard;
