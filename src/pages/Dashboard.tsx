
import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardContent from '@/components/student/DashboardContent';
import { ClassCalendarContainer } from '@/components/student/ClassCalendarContainer';
import StudentContent from '@/components/shared/StudentContent';
import { useQueryClient } from '@tanstack/react-query';
import { StudentDashboardSkeleton } from '@/components/shared/skeletons';
import { ContentTransition } from '@/components/shared/PageTransition';

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userRole, user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const queryClient = useQueryClient();

  // Invalidate query cache to ensure fresh data when tab changes
  useEffect(() => {
    if (user?.id) {
      if (activeTab === 'schedule') {
        queryClient.invalidateQueries({ queryKey: ['studentClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] });
      }
    }
  }, [activeTab, user?.id, queryClient]);

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
      return <StudentDashboardSkeleton />;
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
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6">My Schedule</h3>
            <ClassCalendarContainer studentId={user?.id || null} />
          </div>
        );
      case 'resources':
        return (
          <div className="py-4">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6">Learning Resources</h3>
            <StudentContent
              classId={user?.id || ''}
              showUploadControls={false}
              uploads={[]}
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
    <div className="space-y-4 sm:space-y-6">
      <ContentTransition transitionKey={activeTab}>
        {renderContent()}
      </ContentTransition>
    </div>
  );
};

export default Dashboard;
