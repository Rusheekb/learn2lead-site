import React, { useEffect, Suspense } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TutorDashboardContent from '@/components/tutor/TutorDashboardContent';
import TutorStudents from '@/components/tutor/TutorStudents';
import { useQueryClient } from '@tanstack/react-query';
import { TutorDashboardSkeleton, TableSkeleton } from '@/components/shared/skeletons';

const TutorDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'schedule';
  const { userRole, user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // Invalidate queries when switching to schedule tab
  useEffect(() => {
    if (activeTab === 'schedule' && user?.id) {
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
      queryClient.invalidateQueries({ queryKey: ['tutorStudents', user.id] });
      queryClient.invalidateQueries({ queryKey: ['tutorRelationships', user.id] });
    }
  }, [activeTab, queryClient, user?.id]);

  // Show skeleton while auth is loading
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <TutorDashboardSkeleton />
      </div>
    );
  }

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
      case 'schedule':
        return <TutorDashboardContent />;
      case 'students':
        return <TutorStudents />;
      default:
        return <TutorDashboardContent />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {renderContent()}
    </div>
  );
};

export default TutorDashboard;
