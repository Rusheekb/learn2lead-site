
import React, { memo } from "react";
import StatsCard from "./StatsCard";
import { statsData } from "./mock-data";

// Memoize the StatsGrid component to prevent unnecessary re-renders
const StatsGrid: React.FC = memo(() => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          iconName={stat.iconName}
          iconColor={stat.iconColor}
        />
      ))}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';

export default StatsGrid;
