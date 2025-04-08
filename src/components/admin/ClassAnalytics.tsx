
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Calendar, Clock, Users, Beaker, Calculator, BookOpen, Book, Globe } from "lucide-react";

// Mock data for charts
const subjectClassData = [
  { name: "Math", count: 24, color: "#4F46E5" },
  { name: "Science", count: 18, color: "#10B981" },
  { name: "English", count: 15, color: "#F59E0B" },
  { name: "History", count: 12, color: "#EF4444" },
  { name: "Languages", count: 9, color: "#3B82F6" }
];

const weeklyClassesData = [
  { name: "Week 1", classes: 12 },
  { name: "Week 2", classes: 15 },
  { name: "Week 3", classes: 18 },
  { name: "Week 4", classes: 14 },
  { name: "Week 5", classes: 20 },
  { name: "Week 6", classes: 22 },
  { name: "Week 7", classes: 25 },
  { name: "Week 8", classes: 23 }
];

const studentProgressData = [
  { name: "Week 1", avgScore: 72 },
  { name: "Week 2", avgScore: 74 },
  { name: "Week 3", avgScore: 78 },
  { name: "Week 4", avgScore: 76 },
  { name: "Week 5", avgScore: 80 },
  { name: "Week 6", avgScore: 83 },
  { name: "Week 7", avgScore: 85 },
  { name: "Week 8", avgScore: 88 }
];

// Analytics stat cards data
const statsData = [
  {
    title: "Total Classes",
    value: "158",
    change: "+12% from last month",
    icon: <Calendar className="h-8 w-8 text-tutoring-blue" />
  },
  {
    title: "Active Students",
    value: "42",
    change: "+5 from last month",
    icon: <Users className="h-8 w-8 text-green-600" />
  },
  {
    title: "Average Class Duration",
    value: "54 min",
    change: "+2 min from last month",
    icon: <Clock className="h-8 w-8 text-amber-500" />
  },
  {
    title: "Active Tutors",
    value: "12",
    change: "Same as last month",
    icon: <Users className="h-8 w-8 text-purple-600" />
  }
];

const ClassAnalytics: React.FC = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Learning Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <Card key={index}>
            <CardContent className="flex p-6 items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes by Subject Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Classes by Subject</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer
              config={{
                math: { color: "#4F46E5" },
                science: { color: "#10B981" },
                english: { color: "#F59E0B" },
                history: { color: "#EF4444" },
                languages: { color: "#3B82F6" },
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={subjectClassData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="var(--color-math)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Weekly Classes Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Classes Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer
              config={{
                classes: { color: "#3B82F6" },
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={weeklyClassesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="classes" 
                    stroke="var(--color-classes)" 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Student Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Student Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer
              config={{
                avgScore: { color: "#10B981" },
              }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={studentProgressData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[60, 100]} />
                  <ChartTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avgScore" 
                    name="Average Score" 
                    stroke="var(--color-avgScore)" 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 text-tutoring-blue mr-2" />
                  <span>Mathematics</span>
                </div>
                <span className="font-medium">28%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Beaker className="h-5 w-5 text-green-600 mr-2" />
                  <span>Science</span>
                </div>
                <span className="font-medium">24%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-amber-500 mr-2" />
                  <span>English</span>
                </div>
                <span className="font-medium">18%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Book className="h-5 w-5 text-red-600 mr-2" />
                  <span>History</span>
                </div>
                <span className="font-medium">16%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe className="h-5 w-5 text-blue-500 mr-2" />
                  <span>Languages</span>
                </div>
                <span className="font-medium">14%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClassAnalytics;
