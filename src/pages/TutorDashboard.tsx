
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TutorScheduler from '@/components/tutor/TutorScheduler';
import TutorStudents from '@/components/tutor/TutorStudents';
import TutorMaterials from '@/components/tutor/TutorMaterials';
import TutorOverviewSection from '@/components/tutor/dashboard/TutorOverviewSection';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { EventName } from '@/services/analytics/analyticsService';
import { useQueryClient } from '@tanstack/react-query';

const TutorDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { userRole, user } = useAuth();
  const { trackNavigation, trackPageView } = useAnalyticsTracker();
  const queryClient = useQueryClient();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('tutor-dashboard');
  }, [trackPageView]);
  
  // Track tab changes and invalidate queries when switching to schedule tab
  useEffect(() => {
    trackNavigation(EventName.TAB_CHANGE, { tab: activeTab, dashboard: 'tutor' });
    
    // When switching to schedule tab, ensure we have fresh data
    if (activeTab === 'schedule' && user?.id) {
      // Force refresh of scheduled classes data
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
      queryClient.invalidateQueries({ queryKey: ['tutorStudents', user.id] });
      queryClient.invalidateQueries({ queryKey: ['tutorRelationships', user.id] });
      console.log("Invalidated queries for tutor schedule", user.id);
    }
  }, [activeTab, trackNavigation, queryClient, user?.id]);

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
      default:
        return <TutorOverviewSection />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {renderContent()}
    </div>
  );
};

export default TutorDashboard;
