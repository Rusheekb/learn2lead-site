
import React from 'react';
import { ClassCalendarContainer } from './student/ClassCalendarContainer';

interface ClassCalendarProps {
  studentId: string | null;
}

const ClassCalendar: React.FC<ClassCalendarProps> = ({ studentId }) => {
  return <ClassCalendarContainer studentId={studentId} />;
};

export default ClassCalendar;
