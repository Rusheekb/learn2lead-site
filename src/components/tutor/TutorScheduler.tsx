
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ClassEvent, Student } from "@/types/tutorTypes";
import { StudentMessage, StudentUpload } from "../shared/StudentContent";
import { mockStudentMessages, mockStudentUploads } from "../shared/mock-data";
import CalendarWithEvents from "./CalendarWithEvents";
import ClassEventDetails from "./ClassEventDetails";
import NewClassEventForm from "./NewClassEventForm";

// Mock data
const mockStudents: Student[] = [
  { id: 1, name: "Alex Johnson", subjects: ["Mathematics", "Physics"] },
  { id: 2, name: "Jamie Smith", subjects: ["Chemistry", "Biology"] },
  { id: 3, name: "Taylor Brown", subjects: ["English", "History"] },
  { id: 4, name: "Casey Wilson", subjects: ["Spanish", "French"] }
];

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
  const [activeEventTab, setActiveEventTab] = useState<string>("details");
  
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

  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>(mockStudentUploads);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>(mockStudentMessages);

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
  };

  const handleCreateEvent = () => {
    console.log("Creating new class event:", newEvent);
    setIsAddEventOpen(false);
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
    toast.success("Class scheduled successfully!");
  };

  const handleMarkMessageRead = (messageId: number) => {
    setStudentMessages(messages => 
      messages.map(message => 
        message.id === messageId ? { ...message, isRead: true } : message
      )
    );
    toast.success("Message marked as read");
  };

  const handleDownloadFile = (uploadId: number) => {
    const upload = studentUploads.find(u => u.id === uploadId);
    if (upload) {
      toast.success(`Downloading ${upload.fileName}`);
    }
  };

  const getUnreadMessageCount = (classId: number) => {
    return studentMessages.filter(m => m.classId === classId && !m.isRead).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Schedule</h2>
        <Button onClick={() => setIsAddEventOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Schedule New Class
        </Button>
      </div>
      
      <CalendarWithEvents 
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        scheduledClasses={mockScheduledClasses}
        onSelectEvent={handleSelectEvent}
        onAddEventClick={() => setIsAddEventOpen(true)}
        getUnreadMessageCount={getUnreadMessageCount}
      />
      
      <Dialog open={isViewEventOpen} onOpenChange={setIsViewEventOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <ClassEventDetails 
              selectedEvent={selectedEvent}
              studentMessages={studentMessages}
              studentUploads={studentUploads}
              onMarkAsRead={handleMarkMessageRead}
              onDownloadFile={handleDownloadFile}
              activeTab={activeEventTab}
              setActiveTab={setActiveEventTab}
              unreadMessageCount={getUnreadMessageCount(selectedEvent.id)}
            />
          )}
          
          <DialogFooter>
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => setIsViewEventOpen(false)}>Close</Button>
              <Button>Edit Class</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Class</DialogTitle>
          </DialogHeader>
          
          <NewClassEventForm 
            newEvent={newEvent}
            setNewEvent={setNewEvent}
            students={mockStudents}
          />
          
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
