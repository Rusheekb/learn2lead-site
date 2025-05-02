
import React, { useState, useEffect } from 'react';
import TutorOverviewCard from './TutorOverviewCard';
import TutorQuickAccessCard from './TutorQuickAccessCard';
import TutorOverviewSkeleton from './TutorOverviewSkeleton';

const TutorOverviewSection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <TutorOverviewSkeleton />;
  }

  return (
    <section className="space-y-8" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading" className="text-2xl font-bold">Tutor Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6" role="list" aria-label="Overview statistics">
        <TutorOverviewCard
          title="Upcoming Classes"
          value="5"
          description="Next class: Today at 3:00 PM"
          link="/tutor-dashboard#schedule"
          ariaLabel="View 5 upcoming classes - Next class is today at 3:00 PM"
        />
        <TutorOverviewCard
          title="Active Students"
          value="7"
          description="2 new students this month"
          link="/tutor-dashboard#students"
          ariaLabel="View 7 active students - 2 new students this month"
        />
        <TutorOverviewCard
          title="Class Materials"
          value="15"
          description="5 shared with students"
          link="/tutor-dashboard#materials"
          ariaLabel="View 15 class materials - 5 shared with students"
        />
      </div>

      <h3 id="quick-access-heading" className="text-xl font-medium mt-8 mb-4">Quick Access</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6" role="list" aria-labelledby="quick-access-heading">
        <TutorQuickAccessCard
          title="Schedule a New Class"
          description="Create a new class session with a student"
          buttonText="Schedule Class"
          link="/tutor-dashboard#schedule"
          ariaLabel="Schedule a new class session with a student"
        />
        <TutorQuickAccessCard
          title="Upload Materials"
          description="Share notes, worksheets and resources"
          buttonText="Upload Materials"
          link="/tutor-dashboard#materials"
          ariaLabel="Upload and share notes, worksheets and resources"
        />
        <TutorQuickAccessCard
          title="Student Progress"
          description="View and update student progress notes"
          buttonText="View Students"
          link="/tutor-dashboard#students"
          ariaLabel="View and update student progress notes"
        />
      </div>
    </section>
  );
};

export default TutorOverviewSection;
