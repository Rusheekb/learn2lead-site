import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import DashboardContent from '@/components/student/DashboardContent';
import ClassCalendar from '@/components/ClassCalendar';
import StudentContent from '@/components/shared/StudentContent';
import { useAnalyticsTracker } from '@/hooks/useAnalyticsTracker';
import { EventName } from '@/services/analytics/analyticsService';
import { useQueryClient } from '@tanstack/react-query';

const Dashboard = () => {
  const { t } = useTranslation();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userRole, user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const { trackNavigation, trackPageView } = useAnalyticsTracker();
  const queryClient = useQueryClient();
  
  // Track page view on initial render
  useEffect(() => {
    trackPageView('student-dashboard');
  }, [trackPageView]);
  
  // Track tab changes
  useEffect(() => {
    trackNavigation(EventName.TAB_CHANGE, { tab: activeTab, dashboard: 'student' });
  }, [activeTab, trackNavigation]);

  // Redirect based on user role
  if (userRole && userRole !== 'student') {
    switch (userRole) {
      case 'tutor':
        return <Navigate to="/tutor-dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      default:
        return null;
    }
  }

  useEffect(() => {
    // Set loading to false after a shorter delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [user]);

  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };

  // Determine which content to show based on the active tab
  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardContent
            studentId={user?.id || null}
            selectedSubject={selectedSubject}
            onSubjectClick={handleSubjectClick}
          />
        );
      case 'schedule':
        return (
          <div className="py-4">
            <h3 className="text-xl font-bold mb-6">My Schedule</h3>
            <ClassCalendar studentId={user?.id || null} />
          </div>
        );
      case 'resources':
        return (
          <div className="py-4">
            <h3 className="text-xl font-bold mb-6">Learning Resources</h3>
            <StudentContent
              classId={user?.id || ''}
              showUploadControls={false}
              uploads={[]}
              messages={[]}
            />
          </div>
        );
      default:
        return <DashboardContent 
          studentId={user?.id || null}
          selectedSubject={selectedSubject}
          onSubjectClick={handleSubjectClick}
        />;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('dashboard.studentDashboard')}</h2>
      {renderContent()}
    </div>
  );
};

export default Dashboard;
