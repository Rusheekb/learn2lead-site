
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
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Tutor Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <TutorOverviewCard
          title="Upcoming Classes"
          value="5"
          description="Next class: Today at 3:00 PM"
          link="/tutor-dashboard#schedule"
        />
        <TutorOverviewCard
          title="Active Students"
          value="7"
          description="2 new students this month"
          link="/tutor-dashboard#students"
        />
        <TutorOverviewCard
          title="Class Materials"
          value="15"
          description="5 shared with students"
          link="/tutor-dashboard#materials"
        />
      </div>

      <h3 className="text-xl font-medium mt-8 mb-4">Quick Access</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <TutorQuickAccessCard
          title="Schedule a New Class"
          description="Create a new class session with a student"
          buttonText="Schedule Class"
          link="/tutor-dashboard#schedule"
        />
        <TutorQuickAccessCard
          title="Upload Materials"
          description="Share notes, worksheets and resources"
          buttonText="Upload Materials"
          link="/tutor-dashboard#materials"
        />
        <TutorQuickAccessCard
          title="Student Progress"
          description="View and update student progress notes"
          buttonText="View Students"
          link="/tutor-dashboard#students"
        />
      </div>
    </div>
  );
};

export default TutorOverviewSection;
