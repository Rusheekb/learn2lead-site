
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Placeholder components for demonstration
const MyStudents: React.FC = () => <div>Your students will appear here.</div>;
const ClassMaterials: React.FC = () => <div>Your class materials will appear here.</div>;
const ScheduleSession: React.FC = () => <div>Session scheduling UI goes here.</div>;
const ProfileSettings: React.FC = () => <div>Your profile & settings here.</div>;

const TutorDashboard: React.FC = () => {
  const [tab, setTab] = useState<"students" | "materials" | "schedule" | "settings">("students");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8 text-tutoring-blue">Tutor Dashboard</h1>
        <Tabs value={tab} onValueChange={value => setTab(value as typeof tab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <MyStudents />
          </TabsContent>
          <TabsContent value="materials">
            <ClassMaterials />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleSession />
          </TabsContent>
          <TabsContent value="settings">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TutorDashboard;
