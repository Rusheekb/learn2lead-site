
import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import TutorDashboardContent from '@/components/tutor/TutorDashboardContent';
import TutorStudents from '@/components/tutor/TutorStudents';
import TutorMaterials from '@/components/tutor/TutorMaterials';
import TutorOverviewSection from '@/components/tutor/dashboard/TutorOverviewSection';
import { useQueryClient } from '@tanstack/react-query';

const TutorDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'schedule';
  const { userRole, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Invalidate queries when switching to schedule tab
  useEffect(() => {
    // When switching to schedule tab, ensure we have fresh data
    if (activeTab === 'schedule' && user?.id) {
      // Force refresh of scheduled classes data
      queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
      queryClient.invalidateQueries({ queryKey: ['tutorStudents', user.id] });
      queryClient.invalidateQueries({ queryKey: ['tutorRelationships', user.id] });
      console.log("Invalidated queries for tutor schedule", user.id);
    }
  }, [activeTab, queryClient, user?.id]);

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
