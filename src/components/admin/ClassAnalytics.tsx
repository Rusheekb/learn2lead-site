
import React from "react";
import StatsGrid from "./analytics/StatsGrid";
import SubjectClassesChart from "./analytics/SubjectClassesChart";
import WeeklyClassesChart from "./analytics/WeeklyClassesChart";
import StudentProgressChart from "./analytics/StudentProgressChart";
import PopularSubjects from "./analytics/PopularSubjects";
import { subjectClassData, weeklyClassesData, studentProgressData } from "./analytics/mock-data";

const ClassAnalytics: React.FC = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Learning Analytics</h2>
      
      <StatsGrid />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes by Subject Chart */}
        <SubjectClassesChart data={subjectClassData} />
        
        {/* Weekly Classes Chart */}
        <WeeklyClassesChart data={weeklyClassesData} />
        
        {/* Student Progress Chart */}
        <StudentProgressChart data={studentProgressData} />
        
        {/* Subject Distribution */}
        <PopularSubjects />
      </div>
    </div>
  );
};

export default ClassAnalytics;
