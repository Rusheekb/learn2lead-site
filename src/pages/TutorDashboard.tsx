
import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TutorScheduler from '@/components/tutor/TutorScheduler';
import TutorStudents from '@/components/tutor/TutorStudents';
import TutorMaterials from '@/components/tutor/TutorMaterials';
import ProfilePage from '@/components/shared/ProfilePage';
import TutorOverviewSection from '@/components/tutor/dashboard/TutorOverviewSection';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { EventName } from '@/services/analytics/analyticsService';

const TutorDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { userRole } = useAuth();
  const { trackNavigation, trackPageView } = useAnalyticsTracker();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('tutor-dashboard');
  }, [trackPageView]);
  
  // Track tab changes
  useEffect(() => {
    trackNavigation(EventName.TAB_CHANGE, { tab: activeTab, dashboard: 'tutor' });
  }, [activeTab, trackNavigation]);

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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-gray-100">Tutor Dashboard</h2>
      {renderContent()}
    </div>
  );
};

export default TutorDashboard;
