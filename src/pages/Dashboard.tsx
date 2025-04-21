
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProfilePage from "@/components/shared/ProfilePage";
import DashboardNav from "@/components/student/DashboardNav";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import DashboardContent from "@/components/student/DashboardContent";
import StudentContent from "@/components/shared/StudentContent";
import ClassCalendar from "@/components/ClassCalendar";

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
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

  React.useEffect(() => {
    // Set loading to false after a shorter delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user]);

  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Student Dashboard</h2>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="schedule">My Schedule</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dashboard" className="pt-2">
                <DashboardContent 
                  studentId={user?.id || null}
                  selectedSubject={selectedSubject}
                  onSubjectClick={handleSubjectClick}
                />
              </TabsContent>
              
              <TabsContent value="schedule" className="pt-2">
                <div className="py-4">
                  <h3 className="text-xl font-bold mb-6">My Schedule</h3>
                  <ClassCalendar studentId={user?.id || null} />
                </div>
              </TabsContent>
              
              <TabsContent value="resources" className="pt-2">
                <div className="py-4">
                  <h3 className="text-xl font-bold mb-6">Learning Resources</h3>
                  <StudentContent 
                    classId={user?.id || ""} 
                    showUploadControls={false}
                    uploads={[]}
                    messages={[]}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="profile" className="pt-2">
                <ProfilePage />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
