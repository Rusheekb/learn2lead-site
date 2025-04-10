
import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import ClassLogs from "@/components/admin/ClassLogs";
import PaymentsManager from "@/components/admin/PaymentsManager";
import TutorsManager from "@/components/admin/TutorsManager";
import StudentsManager from "@/components/admin/StudentsManager";

const AdminDashboard: React.FC = () => {
  // Store active section in state
  const [activeSection, setActiveSection] = useState<string>("analytics");
  
  // Listen for hash changes in URL and update on component mount
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setActiveSection(hash);
      } else {
        // Default to analytics if no hash is present
        setActiveSection("analytics");
      }
    };
    
    // Set active section on initial load
    handleHashChange();
    
    // Add event listener for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      // Cleanup event listener on component unmount
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // For debugging
  useEffect(() => {
    console.log("Current active section:", activeSection);
  }, [activeSection]);

  // Render appropriate section based on the active section
  const renderSection = () => {
    switch (activeSection) {
      case "schedule":
        return <ClassLogs />;
      case "payments":
        return <PaymentsManager />;
      case "tutors":
        return <TutorsManager />;
      case "students":
        return <StudentsManager />;
      case "analytics":
      default:
        // Default to analytics
        return <ClassAnalytics />;
    }
  };

  return (
    <DashboardLayout title="Admin Portal" role="admin">
      {renderSection()}
    </DashboardLayout>
  );
};

export default AdminDashboard;
