import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Skeleton for stat/metric cards (used in admin dashboard)
 */
export const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
);

/**
 * Skeleton for a row of stat cards
 */
export const StatCardGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
  </div>
);

/**
 * Skeleton for subject/feature cards
 */
export const SubjectCardSkeleton = () => (
  <Card className="p-4">
    <div className="flex items-center gap-3 mb-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="h-5 w-24" />
    </div>
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4" />
  </Card>
);

/**
 * Skeleton for a grid of subject cards
 */
export const SubjectCardsGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <SubjectCardSkeleton key={i} />
      ))}
  </div>
);

/**
 * Skeleton for calendar component
 */
export const CalendarSkeleton = () => (
  <Card className="p-4">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-6 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1 mb-2">
      {Array(7)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array(35)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
    </div>
  </Card>
);

/**
 * Skeleton for class history items
 */
export const ClassHistoryItemSkeleton = () => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  </Card>
);

/**
 * Skeleton for class history section
 */
export const ClassHistorySkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
    <div className="space-y-2">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <ClassHistoryItemSkeleton key={i} />
        ))}
    </div>
  </div>
);

/**
 * Skeleton for upcoming classes/sessions
 */
export const UpcomingSessionSkeleton = () => (
  <Card className="p-4">
    <div className="flex items-start gap-4">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-9 w-20" />
    </div>
  </Card>
);

/**
 * Skeleton for a list of upcoming sessions
 */
export const UpcomingSessionsListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <UpcomingSessionSkeleton key={i} />
      ))}
  </div>
);

/**
 * Skeleton for tabs navigation
 */
export const TabsSkeleton = ({ tabCount = 3 }: { tabCount?: number }) => (
  <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
    {Array(tabCount)
      .fill(0)
      .map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded" />
      ))}
  </div>
);

/**
 * Skeleton for table rows
 */
export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <div className="flex items-center gap-4 p-4 border-b">
    {Array(columns)
      .fill(0)
      .map((_, i) => (
        <Skeleton key={i} className="h-5 flex-1" />
      ))}
  </div>
);

/**
 * Skeleton for full table
 */
export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
  <Card>
    <div className="p-4 border-b">
      <div className="flex items-center gap-4">
        {Array(columns)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
      </div>
    </div>
    {Array(rows)
      .fill(0)
      .map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
  </Card>
);

/**
 * Full student dashboard skeleton
 */
export const StudentDashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <Card className="p-4">
      <Skeleton className="h-6 w-32" />
    </Card>
    <SubjectCardsGridSkeleton count={6} />
    <CalendarSkeleton />
    <ClassHistorySkeleton count={3} />
  </div>
);

/**
 * Full tutor dashboard skeleton
 */
export const TutorDashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-40" />
    <TabsSkeleton tabCount={2} />
    <CalendarSkeleton />
  </div>
);

/**
 * Full admin dashboard skeleton
 */
export const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <StatCardGridSkeleton count={4} />
    <TabsSkeleton tabCount={5} />
    <TableSkeleton rows={5} columns={6} />
  </div>
);
