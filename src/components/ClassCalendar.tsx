
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Video, Link, Clock, User, Calendar as CalendarIcon } from "lucide-react";
import { format, isBefore, isToday, addDays, startOfDay } from "date-fns";

// Type definitions
interface ClassSession {
  id: number;
  title: string;
  subjectId: number;
  tutorName: string;
  date: Date;
  startTime: string;
  endTime: string;
  zoomLink: string;
  recurring: boolean;
  recurringDays?: string[];
}

const mockSessions: ClassSession[] = [
  {
    id: 1,
    title: "Algebra Fundamentals",
    subjectId: 1,
    tutorName: "Ms. Johnson",
    date: new Date(2025, 3, 9), // April 9, 2025
    startTime: "16:00",
    endTime: "17:00",
    zoomLink: "https://zoom.us/j/123456789",
    recurring: true,
    recurringDays: ["Wednesday"]
  },
  {
    id: 2,
    title: "Chemistry Lab Prep",
    subjectId: 2,
    tutorName: "Mr. Chen",
    date: new Date(2025, 3, 11), // April 11, 2025
    startTime: "15:30",
    endTime: "16:30",
    zoomLink: "https://zoom.us/j/987654321",
    recurring: true,
    recurringDays: ["Friday"]
  },
  {
    id: 3,
    title: "Essay Writing Workshop",
    subjectId: 3,
    tutorName: "Dr. Martinez",
    date: new Date(2025, 3, 10), // April 10, 2025
    startTime: "17:00",
    endTime: "18:30",
    zoomLink: "https://zoom.us/j/567891234",
    recurring: false
  }
];

// Helper function to format time
const formatTime = (timeString: string) => {
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Helper function to get sessions for a specific date
const getSessionsForDate = (date: Date, sessions: ClassSession[]) => {
  return sessions.filter(session => {
    // Check if it's the exact date
    if (session.date.getDate() === date.getDate() && 
        session.date.getMonth() === date.getMonth() && 
        session.date.getFullYear() === date.getFullYear()) {
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
    const sessionDate = startOfDay(session.date);
    return (isToday(sessionDate) || isBefore(today, sessionDate)) && 
           isBefore(sessionDate, futureDate);
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
};

// Session Detail Component
const SessionDetail: React.FC<{ session: ClassSession }> = ({ session }) => {
  return (
    <div className="p-4 border rounded-md mb-3">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium">{session.title}</h3>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <User className="h-4 w-4 mr-1" />
            <span>{session.tutorName}</span>
          </div>
        </div>
        {session.recurring && (
          <span className="text-xs bg-tutoring-blue/10 text-tutoring-blue px-2 py-1 rounded">
            Recurring
          </span>
        )}
      </div>
      
      <div className="flex items-center text-sm text-gray-600 mb-2">
        <Clock className="h-4 w-4 mr-2" />
        <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-gray-500">
          {session.recurring ? 'Every ' + session.recurringDays?.join(', ') : 'One-time class'}
        </span>
        <a 
          href={session.zoomLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center text-tutoring-blue hover:text-tutoring-teal transition-colors"
        >
          <Video className="h-4 w-4 mr-1" />
          <span>Join Class</span>
        </a>
      </div>
    </div>
  );
};

// Main Calendar Component
const ClassCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const sessionsForSelectedDate = getSessionsForDate(selectedDate, mockSessions);
  const upcomingSessions = getUpcomingSessions(mockSessions);
  
  // Function to check if a date has sessions
  const hasSessionsOnDate = (date: Date) => {
    return getSessionsForDate(date, mockSessions).length > 0;
  };
  
  // Custom renderer for calendar days
  const dayWithSessionsClassNames = 
    "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-tutoring-teal after:rounded-full";
  
  return (
    <div className="mt-8">
      <h3 className="text-xl font-medium mb-4">Class Calendar</h3>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Column */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded border p-3"
                modifiers={{
                  hasSession: (date) => hasSessionsOnDate(date),
                }}
                modifiersClassNames={{
                  hasSession: dayWithSessionsClassNames
                }}
                components={{
                  DayContent: ({ date, ...props }) => (
                    <div {...props}>
                      {date.getDate()}
                      {hasSessionsOnDate(date) && (
                        <span className="sr-only"> (has sessions)</span>
                      )}
                    </div>
                  ),
                }}
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
                    <SessionDetail key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border rounded-md">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p>No classes scheduled for this date</p>
                </div>
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
                    <div key={session.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{session.title}</h3>
                        {session.recurring && (
                          <span className="text-xs bg-tutoring-blue/10 text-tutoring-blue px-2 py-1 rounded">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <User className="h-4 w-4 mr-1" />
                        <span>{session.tutorName}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{format(session.date, 'EEE, MMM d')} • {formatTime(session.startTime)}</span>
                      </div>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-tutoring-blue mt-2"
                        asChild
                      >
                        <a href={session.zoomLink} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1 inline" />
                          Join Class
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border rounded-md">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                  <p>No upcoming classes</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassCalendar;
