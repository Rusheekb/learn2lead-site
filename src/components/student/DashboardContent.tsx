
import React, { memo } from 'react';
import SubjectCards from './SubjectCards';
import { ClassCalendarContainer } from './ClassCalendarContainer';
import ClassHistory from '@/components/shared/ClassHistory';
import { subjects } from '@/constants/subjectsData';
import { SubscriptionStatusCard } from './SubscriptionStatusCard';

interface DashboardContentProps {
  studentId: string | null;
  selectedSubject: number | null;
  onSubjectClick: (subjectId: number) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = memo(
  ({ studentId, selectedSubject, onSubjectClick }) => {
    return (
      <>
        <h2 className="text-2xl font-bold mb-6">My Learning Portal</h2>
        <SubscriptionStatusCard />
        <SubjectCards
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSubjectClick={onSubjectClick}
        />
        <ClassCalendarContainer studentId={studentId} />
        <div className="mt-8">
          <ClassHistory userRole="student" />
        </div>
      </>
    );
  }
);

DashboardContent.displayName = 'DashboardContent';

export default DashboardContent;
