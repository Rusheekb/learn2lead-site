
import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProfilePage from "@/components/shared/ProfilePage";
import DashboardNav from "@/components/student/DashboardNav";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import DashboardContent from "@/components/student/DashboardContent";

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const location = useLocation();
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
    // Set loading to false after a short delay to allow auth state to resolve
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user]);

  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };

  const isProfilePage = location.pathname === '/profile';

  if (isProfilePage) {
    return <ProfilePage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <DashboardContent 
            studentId={user?.id || null}
            selectedSubject={selectedSubject}
            onSubjectClick={handleSubjectClick}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
