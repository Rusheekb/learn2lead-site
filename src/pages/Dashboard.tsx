
import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProfilePage from "@/components/shared/ProfilePage";
import DashboardNav from "@/components/student/DashboardNav";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import DashboardContent from "@/components/student/DashboardContent";
import StudentContent from "@/components/shared/StudentContent";
import ClassCalendar from "@/components/ClassCalendar";

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>("");
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

  // Listen for hash changes in URL and update on component mount
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setActiveSection(hash);
      } else {
        setActiveSection("");
      }
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  // Render appropriate section based on the active section
  const renderSection = () => {
    switch (activeSection) {
      case "schedule":
        return <div className="py-4">
          <h2 className="text-2xl font-bold mb-6">My Schedule</h2>
          <ClassCalendar studentId={user?.id || null} />
        </div>;
      case "resources":
        return <div className="py-4">
          <h2 className="text-2xl font-bold mb-6">Learning Resources</h2>
          <StudentContent 
            classId={user?.id || ""} 
            showUploadControls={false}
            uploads={[]}
            messages={[]}
          />
        </div>;
      case "messages":
        return <div className="py-4">
          <h2 className="text-2xl font-bold mb-6">Messages</h2>
          <p>Here you can view and manage your messages with tutors.</p>
          <div className="mt-4 p-6 bg-gray-50 rounded-lg border text-center">
            <p className="text-gray-500">You have no new messages</p>
          </div>
        </div>;
      case "profile":
        return <ProfilePage />;
      default:
        return (
          <DashboardContent 
            studentId={user?.id || null}
            selectedSubject={selectedSubject}
            onSubjectClick={handleSubjectClick}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? <LoadingSpinner /> : renderSection()}
      </main>
    </div>
  );
};

export default Dashboard;
