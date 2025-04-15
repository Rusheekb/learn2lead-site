
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format, isBefore, isToday, addDays, startOfDay } from "date-fns";
import ClassCalendarColumn from "./student/ClassCalendarColumn";
import ClassSessionDetail from "./student/ClassSessionDetail";
import UpcomingSessionCard from "./student/UpcomingSessionCard";
import EmptySessionsState from "./student/EmptySessionsState";
import { ClassSession } from "@/types/classTypes";

// Mock sessions using the ClassSession type from types/classTypes.ts
const mockSessions: ClassSession[] = [
  {
    id: "1",
    title: "Algebra Fundamentals",
    subjectId: "1",
    tutorName: "Ms. Johnson",
    date: new Date(2025, 3, 9), // April 9, 2025
    startTime: "16:00",
    endTime: "17:00",
    zoomLink: "https://zoom.us/j/123456789",
    recurring: true,
    recurringDays: ["Wednesday"]
  },
  {
    id: "2",
    title: "Chemistry Lab Prep",
    subjectId: "2",
    tutorName: "Mr. Chen",
    date: new Date(2025, 3, 11), // April 11, 2025
    startTime: "15:30",
    endTime: "16:30",
    zoomLink: "https://zoom.us/j/987654321",
    recurring: true,
    recurringDays: ["Friday"]
  },
  {
    id: "3",
    title: "Essay Writing Workshop",
    subjectId: "3",
    tutorName: "Dr. Martinez",
    date: new Date(2025, 3, 10), // April 10, 2025
    startTime: "17:00",
    endTime: "18:30",
    zoomLink: "https://zoom.us/j/567891234",
    recurring: false
  }
];

// Helper function to get sessions for a specific date
const getSessionsForDate = (date: Date, sessions: ClassSession[]) => {
  return sessions.filter(session => {
    // Check if it's the exact date
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
    
    if (sessionDate.getDate() === date.getDate() && 
        sessionDate.getMonth() === date.getMonth() && 
        sessionDate.getFullYear() === date.getFullYear()) {
      return true;
    }
    
    // Check if it's a recurring session and if today is one of the recurring days
    if (session.recurring && session.recurringDays) {
      const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
      return session.recurringDays.includes(dayOfWeek);
    }
    
    return false;
  });
};

// Helper function to get upcoming sessions in the next few days
const getUpcomingSessions = (sessions: ClassSession[], daysToShow = 7) => {
  const today = startOfDay(new Date());
  const futureDate = addDays(today, daysToShow);
  
  return sessions.filter(session => {
    const sessionDate = session.date instanceof Date ? 
      startOfDay(session.date) : startOfDay(new Date(session.date));
    
    return (isToday(sessionDate) || isBefore(today, sessionDate)) && 
           isBefore(sessionDate, futureDate);
  }).sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
    const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
    return dateA - dateB;
  });
};

// Main Calendar Component
const ClassCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const sessionsForSelectedDate = getSessionsForDate(selectedDate, mockSessions);
  const upcomingSessions = getUpcomingSessions(mockSessions);
  
  return (
    <div className="mt-8">
      <h3 className="text-xl font-medium mb-4">Class Calendar</h3>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Column */}
            <div>
              <ClassCalendarColumn 
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                sessions={mockSessions}
              />
            </div>
            
            {/* Selected Date Classes Column */}
            <div>
              <h4 className="text-lg font-medium mb-3">
                Classes on {format(selectedDate, 'MMMM d, yyyy')}
              </h4>
              
              {sessionsForSelectedDate.length > 0 ? (
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {sessionsForSelectedDate.map((session) => (
                    <ClassSessionDetail key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <EmptySessionsState message="No classes scheduled for this date" />
              )}
            </div>
            
            {/* Upcoming Classes Column */}
            <div>
              <h4 className="text-lg font-medium mb-3">
                Upcoming Classes
              </h4>
              
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {upcomingSessions.map((session) => (
                    <UpcomingSessionCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <EmptySessionsState message="No upcoming classes" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassCalendar;
