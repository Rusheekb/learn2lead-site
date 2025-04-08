
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, User, Video, FileText } from "lucide-react";

// Mock data for students
const mockStudents = [
  { id: 1, name: "Alex Johnson", subjects: ["Mathematics", "Physics"] },
  { id: 2, name: "Jamie Smith", subjects: ["Chemistry", "Biology"] },
  { id: 3, name: "Taylor Brown", subjects: ["English", "History"] },
  { id: 4, name: "Casey Wilson", subjects: ["Spanish", "French"] }
];

interface ClassEvent {
  id: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  studentId: number;
  studentName: string;
  subject: string;
  zoomLink: string;
  materials?: string[];
  notes?: string;
  recurring: boolean;
  recurringDays?: string[];
}

// Mock data for scheduled classes
const mockScheduledClasses: ClassEvent[] = [
  {
    id: 1,
    title: "Math Tutoring - Algebra",
    date: new Date(2025, 3, 10),
    startTime: "15:00",
    endTime: "16:00",
    studentId: 1,
    studentName: "Alex Johnson",
    subject: "Mathematics",
    zoomLink: "https://zoom.us/j/123456789",
    materials: ["Algebra Worksheet", "Practice Problems"],
    notes: "Focus on quadratic equations and factoring",
    recurring: true,
    recurringDays: ["Wednesday"]
  },
  {
    id: 2,
    title: "Chemistry Lab Prep",
    date: new Date(2025, 3, 12),
    startTime: "14:00",
    endTime: "15:30",
    studentId: 2,
    studentName: "Jamie Smith",
    subject: "Chemistry",
    zoomLink: "https://zoom.us/j/987654321",
    materials: ["Lab Safety Guidelines", "Experiment Overview"],
    notes: "Review safety procedures before lab session",
    recurring: false
  }
];

const TutorScheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  
  // New class event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: new Date(),
    startTime: "09:00",
    endTime: "10:00",
    studentId: "",
    subject: "",
    zoomLink: "",
    notes: "",
    recurring: false,
    recurringDays: []
  });
  
  // Get events for the selected date
  const getEventsForDate = (date: Date) => {
    return mockScheduledClasses.filter(event => {
      // Check for exact date match
      const sameDay = event.date.getDate() === date.getDate() && 
                     event.date.getMonth() === date.getMonth() && 
                     event.date.getFullYear() === date.getFullYear();
      
      // Check for recurring events
      if (event.recurring && event.recurringDays) {
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
        return sameDay || event.recurringDays.includes(dayOfWeek);
      }
      
      return sameDay;
    });
  };
  
  // Check if date has events for calendar highlighting
  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };
  
  // Format time for display
  const formatTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };
  
  // Handle selecting an event to view
  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
  };
  
  // Handle creating a new class event
  const handleCreateEvent = () => {
    // In a real app, this would save to a database
    console.log("Creating new class event:", newEvent);
    setIsAddEventOpen(false);
    // Reset form
    setNewEvent({
      title: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      studentId: "",
      subject: "",
      zoomLink: "",
      notes: "",
      recurring: false,
      recurringDays: []
    });
  };
  
  const eventsForSelectedDate = getEventsForDate(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Schedule</h2>
        <Button onClick={() => setIsAddEventOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Schedule New Class
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded border p-3"
              modifiers={{
                hasEvent: (date) => hasEventsOnDate(date),
              }}
              modifiersClassNames={{
                hasEvent: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:bg-tutoring-teal after:rounded-full"
              }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              Classes for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsForSelectedDate.length > 0 ? (
              <div className="space-y-4">
                {eventsForSelectedDate.map((event) => (
                  <div 
                    key={event.id}
                    className="p-4 border rounded-md hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{event.title}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <User className="h-4 w-4 mr-1" />
                          <span>{event.studentName}</span>
                        </div>
                      </div>
                      {event.recurring && (
                        <span className="text-xs bg-tutoring-blue/10 text-tutoring-blue px-2 py-1 rounded">
                          Recurring
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {event.recurring ? `Every ${event.recurringDays?.join(', ')}` : 'One-time class'}
                      </span>
                      <a 
                        href={event.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-tutoring-blue hover:text-tutoring-teal transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Video className="h-4 w-4 mr-1" />
                        <span>Join Class</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                <Calendar className="h-10 w-10 mb-2 text-gray-400" />
                <p>No classes scheduled for this date</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddEventOpen(true)}
                >
                  Schedule a Class
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog for viewing class details */}
      <Dialog open={isViewEventOpen} onOpenChange={setIsViewEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Student</h4>
                  <p>{selectedEvent.studentName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                  <p>{selectedEvent.subject}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Date</h4>
                  <p>{selectedEvent.date.toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Time</h4>
                  <p>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Zoom Link</h4>
                <a 
                  href={selectedEvent.zoomLink} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tutoring-blue hover:underline flex items-center"
                >
                  <Video className="h-4 w-4 mr-1" />
                  <span>Join Meeting</span>
                </a>
              </div>
              
              {selectedEvent.materials && selectedEvent.materials.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Materials</h4>
                  <ul className="list-disc list-inside">
                    {selectedEvent.materials.map((material, index) => (
                      <li key={index} className="text-tutoring-blue hover:underline cursor-pointer">
                        <div className="inline-flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          <span>{material}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedEvent.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Notes</h4>
                  <p className="text-gray-700">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => setIsViewEventOpen(false)}>Close</Button>
              <Button>Edit Class</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for adding new class */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Class</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Class Title</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Enter class title"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student">Student</Label>
                <Select
                  onValueChange={(value) => setNewEvent({...newEvent, studentId: value})}
                >
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStudents.map(student => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select
                  onValueChange={(value) => setNewEvent({...newEvent, subject: value})}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="History">History</SelectItem>
                    <SelectItem value="Languages">Languages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <div className="border rounded-md mt-1">
                  <Calendar
                    mode="single"
                    selected={newEvent.date}
                    onSelect={(date) => date && setNewEvent({...newEvent, date})}
                    className="p-0"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
              <Input
                id="zoomLink"
                type="url"
                value={newEvent.zoomLink}
                onChange={(e) => setNewEvent({...newEvent, zoomLink: e.target.value})}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newEvent.notes}
                onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
                placeholder="Add any notes or instructions for this class"
              />
            </div>
          </div>
          
          <DialogFooter>
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateEvent}>Schedule Class</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorScheduler;
