
import React from 'react';
import SchedulerHeader from '../SchedulerHeader';

interface TutorSchedulerHeaderProps {
  onAddClick: () => void;
}

const TutorSchedulerHeader: React.FC<TutorSchedulerHeaderProps> = ({ onAddClick }) => {
  return <SchedulerHeader onAddClick={onAddClick} />;
};

export default TutorSchedulerHeader;
