
import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import ClassLogs from "@/components/admin/ClassLogs";
import PaymentsManager from "@/components/admin/PaymentsManager";

const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("");
  
  // Check for hash in URL to set active section
  React.useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      setActiveSection(hash);
    }
  }, []);

  // Render appropriate section based on the active section
  const renderSection = () => {
    switch (activeSection) {
      case "schedule":
        return <ClassLogs />;
      case "payments":
        return <PaymentsManager />;
      default:
        // Default to analytics on the main dashboard page
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
