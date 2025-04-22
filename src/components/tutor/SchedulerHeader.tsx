import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';

interface SchedulerHeaderProps {
  onAddClick: () => void;
}

const SchedulerHeader: React.FC<SchedulerHeaderProps> = ({ onAddClick }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-tutoring-blue" />
        <h2 className="text-2xl font-bold">My Schedule</h2>
      </div>
      <Button
        onClick={onAddClick}
        className="bg-tutoring-blue hover:bg-tutoring-blue/90 flex items-center gap-2"
      >
        <Plus className="h-4 w-4" /> Schedule New Class
      </Button>
    </div>
  );
};

export default SchedulerHeader;
