
import React from "react";
import StatsCard from "./StatsCard";
import { statsData } from "./mock-data";

const StatsGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
};

export default StatsGrid;
