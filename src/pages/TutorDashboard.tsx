
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import TutorScheduler from "@/components/tutor/TutorScheduler";
import TutorStudents from "@/components/tutor/TutorStudents";
import TutorMaterials from "@/components/tutor/TutorMaterials";
import ProfilePage from "@/components/shared/ProfilePage";
import TutorOverviewSection from "@/components/tutor/dashboard/TutorOverviewSection";
import { useAuth } from "@/contexts/AuthContext";

const TutorDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("");
  const location = useLocation();
  const { userRole } = useAuth();
  
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
  
  // Listen for hash changes in URL and update on component mount
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setActiveSection(hash);
      } else {
        setActiveSection("");
        if (window.location.pathname === "/tutor-dashboard" && !window.location.hash) {
          window.location.hash = "";
        }
      }
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check if we're on the profile page
  const isProfilePage = location.pathname === '/tutor-profile';

  // Render appropriate section based on the active section
  const renderSection = () => {
    if (isProfilePage) {
      return <ProfilePage />;
    }

    switch (activeSection) {
      case "schedule":
        return <TutorScheduler />;
      case "students":
        return <TutorStudents />;
      case "materials":
        return <TutorMaterials />;
      case "profile":
        return <ProfilePage />;
      default:
        return <TutorOverviewSection />;
    }
  };

  return (
    <DashboardLayout title="Tutor Portal" role="tutor">
      {renderSection()}
    </DashboardLayout>
  );
};

export default TutorDashboard;
