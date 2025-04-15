import React from 'react';
import { useClassLogs } from '@/hooks/useClassLogs';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

const Dashboard: React.FC = () => {
  const { classes, isLoading: isLoadingClasses } = useClassLogs();
  const {
    isLoading: isLoadingAnalytics,
    businessAnalytics,
    getTopPerformingTutors,
    getTopPerformingStudents,
    getRevenueByMonth,
    getSubjectPopularity,
  } = useAnalytics(classes);

  const isLoading = isLoadingClasses || isLoadingAnalytics;

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

  const topTutors = getTopPerformingTutors('totalClasses');
  const topStudents = getTopPerformingStudents('totalClasses');
  const monthlyClasses = getRevenueByMonth();
  const popularSubjects = getSubjectPopularity();

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
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

      {/* Top Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Tutors</CardTitle>
            <CardDescription>By number of classes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">Classes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTutors.map(({ name, value }) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell className="text-right">{value.toString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Students</CardTitle>
            <CardDescription>By number of classes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Classes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStudents.map(({ name, value }) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell className="text-right">{value.toString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Popular Subjects */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Subjects</CardTitle>
          <CardDescription>Most requested topics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popularSubjects.map(({ subject, count }) => (
                <TableRow key={subject}>
                  <TableCell>{subject}</TableCell>
                  <TableCell className="text-right">{count.toString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Class Distribution</CardTitle>
          <CardDescription>Classes per month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(monthlyClasses)
                .sort((a, b) => {
                  // Sort by date (most recent first)
                  const dateA = new Date(a[0]);
                  const dateB = new Date(b[0]);
                  return dateB.getTime() - dateA.getTime();
                })
                .map(([month, count]) => (
                  <TableRow key={month}>
                    <TableCell>{month}</TableCell>
                    <TableCell className="text-right">{count.toString()}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 