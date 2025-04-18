
import React, { useState, useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import ClassCalendar from "@/components/ClassCalendar";
import { useAuth } from "@/contexts/AuthContext";
import ProfilePage from "@/components/shared/ProfilePage";
import DashboardNav from "@/components/student/DashboardNav";
import SubjectCards from "@/components/student/SubjectCards";
import { subjects } from "@/constants/subjectsData";

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const location = useLocation();
  const { userRole } = useAuth();
  
  if (userRole && userRole !== 'student') {
    switch (userRole) {
      case 'tutor':
        return <Navigate to="/tutor-dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      default:
        return null;
    }
  }

  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };

  const isProfilePage = location.pathname === '/profile';

  if (isProfilePage) {
    return <Routes><Route path="/" element={<ProfilePage />} /></Routes>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">My Learning Portal</h2>
            <SubjectCards 
              subjects={subjects}
              selectedSubject={selectedSubject}
              onSubjectClick={handleSubjectClick}
            />
            <ClassCalendar studentId={studentId} />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
