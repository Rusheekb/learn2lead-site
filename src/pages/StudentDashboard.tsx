
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Placeholder components for demonstration
const ScheduledClasses: React.FC = () => <div>Your scheduled classes will appear here.</div>;
const ClassRequests: React.FC = () => <div>Class join requests will appear here.</div>;
const ProfileSettings: React.FC = () => <div>Your profile & settings here.</div>;

const StudentDashboard: React.FC = () => {
  const [tab, setTab] = useState<"scheduled" | "requests" | "settings">("scheduled");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8 text-tutoring-blue">Student Dashboard</h1>
        <Tabs value={tab} onValueChange={value => setTab(value as typeof tab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="scheduled">Scheduled Classes</TabsTrigger>
            <TabsTrigger value="requests">Class Requests</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scheduled">
            <ScheduledClasses />
          </TabsContent>
          <TabsContent value="requests">
            <ClassRequests />
          </TabsContent>
          <TabsContent value="settings">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
