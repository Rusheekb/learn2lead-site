
import React, { memo } from 'react';
import SubjectCards from './SubjectCards';
import ClassCalendarWithDialog from './ClassCalendarWithDialog';
import { subjects } from '@/constants/subjectsData';

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
        <SubjectCards
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSubjectClick={onSubjectClick}
        />
        <ClassCalendarWithDialog studentId={studentId} sessions={[]} />
      </>
    );
  }
);

DashboardContent.displayName = 'DashboardContent';

export default DashboardContent;
