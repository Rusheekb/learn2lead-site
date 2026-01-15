import React, { memo } from 'react';
import TutorOverviewCard from './TutorOverviewCard';
import TutorOverviewSkeleton from './TutorOverviewSkeleton';
import { useTutorDashboardStats } from '@/hooks/useTutorDashboardStats';

const TutorOverviewSection: React.FC = memo(() => {
  const {
    upcomingClassesCount,
    nextClassDescription,
    activeStudentsCount,
    newStudentsThisMonth,
    contentSharesCount,
    sharedWithStudentsCount,
    isLoading,
  } = useTutorDashboardStats();

  if (isLoading) {
    return <TutorOverviewSkeleton />;
  }

  const studentsDescription = newStudentsThisMonth > 0
    ? `${newStudentsThisMonth} new this month`
    : 'No new students this month';

  const materialsDescription = sharedWithStudentsCount > 0
    ? `${sharedWithStudentsCount} shared with students`
    : 'No materials shared yet';

  return (
    <section className="space-y-6" aria-labelledby="overview-heading">
      <h3 id="overview-heading" className="sr-only">Dashboard Overview</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6" role="list" aria-label="Overview statistics">
        <TutorOverviewCard
          title="Upcoming Classes"
          value={String(upcomingClassesCount)}
          description={nextClassDescription}
          link="/tutor-dashboard?tab=schedule"
          ariaLabel={`View ${upcomingClassesCount} upcoming classes - ${nextClassDescription}`}
        />
        <TutorOverviewCard
          title="Active Students"
          value={String(activeStudentsCount)}
          description={studentsDescription}
          link="/tutor-dashboard?tab=students"
          ariaLabel={`View ${activeStudentsCount} active students - ${studentsDescription}`}
        />
        <TutorOverviewCard
          title="Content Shared"
          value={String(contentSharesCount)}
          description={materialsDescription}
          link="/tutor-dashboard?tab=schedule"
          ariaLabel={`${contentSharesCount} content items shared - ${materialsDescription}`}
        />
      </div>
    </section>
  );
});

TutorOverviewSection.displayName = 'TutorOverviewSection';

export default TutorOverviewSection;
