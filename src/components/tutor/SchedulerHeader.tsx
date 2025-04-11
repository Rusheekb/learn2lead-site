
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SchedulerHeaderProps {
  onAddClick: () => void;
}

const SchedulerHeader: React.FC<SchedulerHeaderProps> = ({ onAddClick }) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">My Schedule</h2>
      <Button onClick={onAddClick} className="flex items-center gap-2">
        <Plus className="h-4 w-4" /> Schedule New Class
      </Button>
    </div>
  );
};

export default SchedulerHeader;
