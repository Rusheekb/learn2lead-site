
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/shared/DashboardLayout';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import DashboardContent from '@/components/student/DashboardContent';
import ProfilePage from '@/components/shared/ProfilePage';
import ClassCalendar from '@/components/ClassCalendar';
import StudentContent from '@/components/shared/StudentContent';

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { userRole, user } = useAuth();

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
            <h3 className="text-xl font-bold mb-6 dark:text-gray-100">My Schedule</h3>
            <ClassCalendar studentId={user?.id || null} />
          </div>
        );
      case 'resources':
        return (
          <div className="py-4">
            <h3 className="text-xl font-bold mb-6 dark:text-gray-100">Learning Resources</h3>
            <StudentContent
              classId={user?.id || ''}
              showUploadControls={false}
              uploads={[]}
              messages={[]}
            />
          </div>
        );
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardContent 
          studentId={user?.id || null}
          selectedSubject={selectedSubject}
          onSubjectClick={handleSubjectClick}
        />;
    }
  };

  return (
    <DashboardLayout title="Student Portal" role="student">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-gray-100">Student Dashboard</h2>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
