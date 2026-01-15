import React, { memo } from 'react';
import TutorScheduler from './TutorScheduler';
import ClassHistory from '@/components/shared/ClassHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TutorDashboardContent: React.FC = memo(() => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tutor Dashboard</h2>
      
      <Tabs defaultValue="scheduler" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scheduler">Class Scheduler</TabsTrigger>
          <TabsTrigger value="history">Class History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scheduler" className="space-y-4">
          <TutorScheduler />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <ClassHistory userRole="tutor" />
        </TabsContent>
      </Tabs>
    </div>
  );
});

TutorDashboardContent.displayName = 'TutorDashboardContent';

export default TutorDashboardContent;