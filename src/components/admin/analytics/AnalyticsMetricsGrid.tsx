
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BusinessAnalytics } from '@/services/analyticsService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

interface AnalyticsMetricsGridProps {
  isLoading: boolean;
  businessAnalytics: BusinessAnalytics | null;
}

const AnalyticsMetricsGrid: React.FC<AnalyticsMetricsGridProps> = ({
  isLoading,
  businessAnalytics,
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[100px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!businessAnalytics) {
    return (
      <div className="text-center py-8">
        <p className="text-lg text-gray-500">No class data available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
          <CardDescription>Overall earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatCurrency(businessAnalytics.totalRevenue)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Net Income</CardTitle>
          <CardDescription>After tutor payments</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatCurrency(businessAnalytics.netIncome)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Retention</CardTitle>
          <CardDescription>Returning students</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatPercent(businessAnalytics.studentRetentionRate)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avg. Class Cost</CardTitle>
          <CardDescription>Per session</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatCurrency(businessAnalytics.averageClassCost)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsMetricsGrid;
