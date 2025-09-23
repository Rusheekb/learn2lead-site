
import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardData } from '@/hooks/useDashboardData';
import OptimizedSuspense from '@/components/shared/OptimizedSuspense';

// Dynamically import the heavy dashboard content component
const DashboardContent = lazy(() => import('./dashboard/DashboardContent'));

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const dashboardData = useDashboardData();
  console.log('Dashboard data:', dashboardData);

  return (
    <OptimizedSuspense>
      <DashboardContent {...dashboardData} />
    </OptimizedSuspense>
  );
};

Dashboard.displayName = 'AdminDashboard';

export default React.memo(Dashboard);
