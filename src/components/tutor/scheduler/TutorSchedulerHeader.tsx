
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar, HelpCircle } from 'lucide-react';
import CalendarHelpDialog from '@/components/shared/CalendarHelpDialog';

interface TutorSchedulerHeaderProps {
  onAddClick: () => void;
}

const TutorSchedulerHeader: React.FC<TutorSchedulerHeaderProps> = ({ onAddClick }) => {
  const [isCalendarHelpOpen, setIsCalendarHelpOpen] = useState(false);
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-medium">Class Schedule</h3>
        <p className="text-sm text-muted-foreground">
          Manage your upcoming classes and schedule new sessions.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setIsCalendarHelpOpen(true)}>
          <Calendar className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Calendar Sync</span>
          <span className="sm:hidden">Sync</span>
        </Button>
        <Button size="sm" className="text-xs sm:text-sm" onClick={onAddClick}>
          <PlusCircle className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Schedule Class</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      
      <CalendarHelpDialog 
        isOpen={isCalendarHelpOpen}
        setIsOpen={setIsCalendarHelpOpen}
      />
    </div>
  );
};

export default TutorSchedulerHeader;
