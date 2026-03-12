import { useState } from 'react';
import { Navigate, useSearchParams, Routes, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardContent from '@/components/student/DashboardContent';
import { ClassCalendarContainer } from '@/components/student/ClassCalendarContainer';
import { StudentDashboardSkeleton } from '@/components/shared/skeletons';
import { ContentTransition } from '@/components/shared/PageTransition';
import { SubjectResourcesList, SubjectResourcesPage } from '@/components/student/resources';

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const { userRole, user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

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

  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };

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
            <SubjectResourcesList />
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
    <Routes>
      <Route path="subject/:subjectId" element={<SubjectResourcesPage />} />
      <Route
        path="*"
        element={
          <div className="space-y-4 sm:space-y-6">
            <ContentTransition transitionKey={activeTab}>
              {renderContent()}
            </ContentTransition>
          </div>
        }
      />
    </Routes>
  );
};

export default Dashboard;
