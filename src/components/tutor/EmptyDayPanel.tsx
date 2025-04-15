
import React from 'react';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';

interface EmptyDayPanelProps {
  onAddClick: () => void;
}

const EmptyDayPanel: React.FC<EmptyDayPanelProps> = ({ onAddClick }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500 border border-dashed rounded-md">
      <CalendarPlus className="h-12 w-12 mb-2 opacity-50" />
      <p className="mb-4">No classes scheduled for this day</p>
      <Button variant="outline" onClick={onAddClick}>
        Add Class
      </Button>
    </div>
  );
};

export default EmptyDayPanel;
