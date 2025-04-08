
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ClassAnalytics from "@/components/admin/ClassAnalytics";
import ClassLogs from "@/components/admin/ClassLogs";
import PaymentsManager from "@/components/admin/PaymentsManager";

const AdminDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = React.useState<string>("");
  
  // Check for hash in URL to set active section
  React.useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      setActiveSection(hash);
    } else {
      // Default to analytics if no hash is present
      setActiveSection("analytics");
    }
  }, []);

  // Render appropriate section based on the active section
  const renderSection = () => {
    switch (activeSection) {
      case "schedule":
        return <ClassLogs />;
      case "payments":
        return <PaymentsManager />;
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
