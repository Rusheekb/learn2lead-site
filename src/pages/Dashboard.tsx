import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, BookOpen, Calendar, GraduationCap, Calculator, Beaker, Globe, Home, User } from "lucide-react";
import ClassCalendar from "@/components/ClassCalendar";
import StudentMenubar from "@/components/student/StudentMenubar";
import { useLocation, useNavigate, Link, Navigate, Routes, Route, Outlet } from "react-router-dom";
import { fetchScheduledClasses } from "@/services/classService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import ProfilePage from "@/components/shared/ProfilePage";

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const location = useLocation();
  const navigate = useNavigate();
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
  
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    setActiveSection(hash);
  }, [location.hash]);
  
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('students')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
          
        if (data?.id) {
          setStudentId(data.id);
        } else {
          console.log('User is not a registered student');
        }
      }
      
      setIsLoading(false);
    };
    
    fetchCurrentUser();
  }, []);
  
  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };
  
  const [subjects, setSubjects] = useState([
    {
      id: 1,
      name: "Mathematics",
      icon: <Calculator className="h-8 w-8 text-tutoring-blue" />,
      description: "Algebra, Geometry, Calculus, and more",
      topics: ["Algebra I", "Geometry", "Algebra II", "Pre-Calculus", "Calculus", "Statistics"]
    },
    {
      id: 2,
      name: "Science",
      icon: <Beaker className="h-8 w-8 text-green-500" />,
      description: "Biology, Chemistry, Physics, and more",
      topics: ["Biology", "Chemistry", "Physics", "Environmental Science", "Astronomy"]
    },
    {
      id: 3,
      name: "English",
      icon: <BookOpen className="h-8 w-8 text-yellow-600" />,
      description: "Literature, Writing, Grammar, and more",
      topics: ["Literature", "Creative Writing", "Grammar", "Vocabulary", "Essay Writing"]
    },
    {
      id: 4,
      name: "History",
      icon: <Book className="h-8 w-8 text-red-600" />,
      description: "World History, U.S. History, and more",
      topics: ["World History", "U.S. History", "European History", "Ancient Civilizations"]
    },
    {
      id: 5,
      name: "Foreign Languages",
      icon: <Globe className="h-8 w-8 text-blue-500" />,
      description: "Spanish, French, Mandarin, and more",
      topics: ["Spanish", "French", "Mandarin", "German", "Latin"]
    },
    {
      id: 6,
      name: "Test Prep",
      icon: <GraduationCap className="h-8 w-8 text-purple-600" />,
      description: "SAT, ACT, AP, and more",
      topics: ["SAT Prep", "ACT Prep", "AP Exams", "State Tests"]
    }
  ]);

  const isProfilePage = location.pathname === '/profile';

  const renderDashboardContent = () => {
    if (isProfilePage) {
      return <Outlet />;
    }

    switch (activeSection) {
      case "schedule":
        return <ClassCalendar studentId={studentId} />;
      case "resources":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Learning Resources</h2>
            <p>Your learning resources will be displayed here.</p>
          </div>
        );
      case "messages":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Messages</h2>
            <p>Your messages with tutors will be displayed here.</p>
          </div>
        );
      case "profile":
        return <ProfilePage />;
      default:
        return (
          <>
            <h2 className="text-2xl font-bold mb-6">My Learning Portal</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card 
                  key={subject.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedSubject === subject.id ? 'ring-2 ring-tutoring-blue' : ''
                  }`}
                  onClick={() => handleSubjectClick(subject.id)}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    {subject.icon}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{subject.description}</p>
                    
                    {selectedSubject === subject.id && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-sm">Topics:</h4>
                        <ul className="pl-5 space-y-1">
                          {subject.topics.map((topic, index) => (
                            <li key={index} className="text-sm">
                              <a 
                                href="#" 
                                className="text-tutoring-blue hover:text-tutoring-teal hover:underline"
                              >
                                {topic}
                              </a>
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full mt-4" size="sm">
                          Explore All {subject.name} Resources
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <ClassCalendar studentId={studentId} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-2xl font-bold text-tutoring-blue">
                Learn<span className="text-tutoring-teal">2</span>Lead
              </Link>
              <span className="ml-2 text-gray-500">Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric'
                })}
              </span>
              <Button variant="ghost" className="ml-2"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
              >
                Logout
              </Button>
            </div>
          </div>
          
          <div className="py-2 flex items-center justify-between">
            <StudentMenubar />
            <Button 
              variant="ghost" 
              className="flex items-center gap-1 text-tutoring-blue"
              onClick={() => navigate('/profile')}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p>Loading...</p>
          </div>
        ) : (
          renderDashboardContent()
        )}
      </main>
    </div>
  );
};

export default Dashboard;
