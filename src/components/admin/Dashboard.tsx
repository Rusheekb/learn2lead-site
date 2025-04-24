
import React from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import DashboardContent from './dashboard/DashboardContent';

const Dashboard: React.FC = () => {
  const dashboardData = useDashboardData();
  console.log('Dashboard data:', dashboardData);

  return <DashboardContent {...dashboardData} />;
};

Dashboard.displayName = 'AdminDashboard';

export default React.memo(Dashboard);
