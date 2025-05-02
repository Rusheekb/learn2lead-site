
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TutorOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Tutor Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <Card key={index}>
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-8 w-10 mb-2" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-xl font-medium mt-8 mb-4">Quick Access</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <Card key={index} className="p-6">
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-4 w-64 mb-6" />
            <Skeleton className="h-10 w-36" />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TutorOverviewSkeleton;
