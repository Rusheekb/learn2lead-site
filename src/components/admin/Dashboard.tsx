
import React, { memo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardContent from './dashboard/DashboardContent';

const Dashboard: React.FC = memo(() => {
  const dashboardData = useDashboardData();
  
  return <DashboardContent 
    isLoading={dashboardData.isLoading}
    businessAnalytics={dashboardData.businessAnalytics}
    topTutors={dashboardData.topTutors}
    topStudents={dashboardData.topStudents}
    monthlyClasses={Object.fromEntries(
      dashboardData.monthlyClasses.map(item => [item.month, item.count])
    )}
    popularSubjects={dashboardData.popularSubjects}
  />;
});

Dashboard.displayName = 'AdminDashboard';

export default Dashboard;
