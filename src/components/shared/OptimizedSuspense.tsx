import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

const DefaultFallback = ({ className }: { className?: string }) => (
  <div className={`space-y-4 p-6 ${className || ''}`}>
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

export const OptimizedSuspense: React.FC<OptimizedSuspenseProps> = ({ 
  children, 
  fallback, 
  className 
}) => {
  return (
    <Suspense fallback={fallback || <DefaultFallback className={className} />}>
      {children}
    </Suspense>
  );
};

export default OptimizedSuspense;