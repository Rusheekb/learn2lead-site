
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

interface EmptyDayPanelProps {
  selectedDate: Date;
  onAddClick: () => void;
}

const EmptyDayPanel: React.FC<EmptyDayPanelProps> = ({ selectedDate, onAddClick }) => {
  const formattedDate = selectedDate.toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <p className="text-gray-500 mb-2">No classes scheduled on</p>
      <p className="text-xl font-medium mb-6">{formattedDate}</p>
      <Button onClick={onAddClick} className="flex items-center gap-2">
        <CalendarPlus className="h-4 w-4" />
        <span>Schedule New Class</span>
      </Button>
    </div>
  );
};

export default EmptyDayPanel;
