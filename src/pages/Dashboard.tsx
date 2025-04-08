
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, BookOpen, Calendar, GraduationCap, Calculator, Beaker, Globe } from "lucide-react";
import ClassCalendar from "@/components/ClassCalendar";

const subjects = [
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
];

const Dashboard = () => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  
  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubject(subjectId === selectedSubject ? null : subjectId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-tutoring-blue">
                Learn<span className="text-tutoring-teal">2</span>Lead
              </h1>
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
              <Button variant="ghost" className="ml-2">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        
        <ClassCalendar />
      </main>
    </div>
  );
};

export default Dashboard;
