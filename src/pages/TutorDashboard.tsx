
import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import TutorScheduler from "@/components/tutor/TutorScheduler";
import TutorStudents from "@/components/tutor/TutorStudents";
import TutorMaterials from "@/components/tutor/TutorMaterials";

const TutorDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("");
  
  // Listen for hash changes in URL and update on component mount
  useEffect(() => {
    const handleHashChange = () => {
      // Extract hash without the # symbol
      const hash = window.location.hash.substring(1);
      
      if (hash) {
        console.log("Setting active section to:", hash);
        setActiveSection(hash);
      } else {
        // Default to overview if no hash is present
        console.log("No hash found, defaulting to overview");
        setActiveSection("");
        // Set default hash if none exists and we're on the main dashboard page
        if (window.location.pathname === "/tutor-dashboard" && !window.location.hash) {
          window.location.hash = "";
        }
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
        return <TutorScheduler />;
      case "students":
        return <TutorStudents />;
      case "materials":
        return <TutorMaterials />;
      default:
        // Default to overview on the main dashboard page
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Tutor Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overview Cards */}
              <DashboardCard 
                title="Upcoming Classes" 
                value="5" 
                description="Next class: Today at 3:00 PM"
                link="/tutor-dashboard#schedule"
              />
              <DashboardCard 
                title="Active Students" 
                value="7" 
                description="2 new students this month"
                link="/tutor-dashboard#students"
              />
              <DashboardCard 
                title="Class Materials" 
                value="15" 
                description="5 shared with students"
                link="/tutor-dashboard#materials"
              />
            </div>
            
            <h3 className="text-xl font-medium mt-8 mb-4">Quick Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuickAccessCard 
                title="Schedule a New Class"
                description="Create a new class session with a student"
                buttonText="Schedule Class"
                link="/tutor-dashboard#schedule"
              />
              <QuickAccessCard 
                title="Upload Materials"
                description="Share notes, worksheets and resources"
                buttonText="Upload Materials"
                link="/tutor-dashboard#materials"
              />
              <QuickAccessCard 
                title="Student Progress"
                description="View and update student progress notes"
                buttonText="View Students"
                link="/tutor-dashboard#students"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout title="Tutor Portal" role="tutor">
      {renderSection()}
    </DashboardLayout>
  );
};

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  link: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, description, link }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <a 
        href={link} 
        className="text-tutoring-blue hover:text-tutoring-teal text-sm mt-4 inline-block"
      >
        View Details →
      </a>
    </div>
  );
};

interface QuickAccessCardProps {
  title: string;
  description: string;
  buttonText: string;
  link: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ title, description, buttonText, link }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
      <a 
        href={link} 
        className="mt-4 inline-flex items-center justify-center rounded-md bg-tutoring-blue px-4 py-2 text-sm font-medium text-white hover:bg-tutoring-blue/90 w-full"
      >
        {buttonText}
      </a>
    </div>
  );
};

export default TutorDashboard;
