import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Calendar as CalendarIcon, Clock, Filter, MoreVertical, Copy, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>(mockScheduledClasses);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>(mockStudentUploads);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>(mockStudentMessages);

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

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    setIsEditMode(false);
  };

  const handleCreateEvent = () => {
    const newClassEvent: ClassEvent = {
      id: scheduledClasses.length + 1,
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      studentId: parseInt(newEvent.studentId),
      studentName: mockStudents.find(s => s.id === parseInt(newEvent.studentId))?.name || "",
      subject: newEvent.subject,
      zoomLink: newEvent.zoomLink,
      notes: newEvent.notes,
      recurring: newEvent.recurring,
      recurringDays: newEvent.recurringDays,
      materials: []
    };

    setScheduledClasses([...scheduledClasses, newClassEvent]);
    setIsAddEventOpen(false);
    resetNewEventForm();
    toast.success("Class scheduled successfully!");
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    setScheduledClasses(classes =>
      classes.map(cls =>
        cls.id === selectedEvent.id
          ? { ...selectedEvent }
          : cls
      )
    );
    
    setIsEditMode(false);
    toast.success("Class updated successfully!");
  };

  const handleDeleteEvent = (eventId: number, isRecurring: boolean = false) => {
    if (isRecurring) {
      // Delete all recurring instances
      setScheduledClasses(classes =>
        classes.filter(cls => 
          !(cls.recurring && cls.title === selectedEvent?.title)
        )
      );
      toast.success("All recurring classes deleted successfully!");
    } else {
      // Delete single instance
      setScheduledClasses(classes =>
        classes.filter(cls => cls.id !== eventId)
      );
      toast.success("Class deleted successfully!");
    }
    setIsViewEventOpen(false);
  };

  const handleDuplicateEvent = (event: ClassEvent) => {
    const duplicatedEvent: ClassEvent = {
      ...event,
      id: scheduledClasses.length + 1,
      date: new Date(event.date),
      recurring: false,
      recurringDays: []
    };
    setScheduledClasses([...scheduledClasses, duplicatedEvent]);
    toast.success("Class duplicated successfully!");
  };

  const resetNewEventForm = () => {
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

  const filteredClasses = scheduledClasses.filter(cls => {
    const matchesSearch = 
      cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || cls.subject === subjectFilter;
    const matchesStudent = studentFilter === "all" || cls.studentId.toString() === studentFilter;
    return matchesSearch && matchesSubject && matchesStudent;
  });

  const allSubjects = Array.from(new Set(scheduledClasses.map(cls => cls.subject))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Schedule</h2>
        <Button onClick={() => setIsAddEventOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Schedule New Class
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {allSubjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={studentFilter} onValueChange={setStudentFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by student" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            {mockStudents.map(student => (
              <SelectItem key={student.id} value={student.id.toString()}>{student.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <CalendarWithEvents 
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        scheduledClasses={filteredClasses}
        onSelectEvent={handleSelectEvent}
        onAddEventClick={() => setIsAddEventOpen(true)}
        getUnreadMessageCount={getUnreadMessageCount}
      />
      
      <Dialog open={isViewEventOpen} onOpenChange={setIsViewEventOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            {selectedEvent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditMode(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Class
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateEvent(selectedEvent)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Class
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Class
                  </DropdownMenuItem>
                  {selectedEvent.recurring && (
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDeleteEvent(selectedEvent.id, true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Recurring
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogHeader>
          
          {selectedEvent && (
            <>
              {isEditMode ? (
                <div className="py-4">
                  <NewClassEventForm 
                    newEvent={{
                      title: selectedEvent.title,
                      date: selectedEvent.date,
                      startTime: selectedEvent.startTime,
                      endTime: selectedEvent.endTime,
                      studentId: selectedEvent.studentId.toString(),
                      subject: selectedEvent.subject,
                      zoomLink: selectedEvent.zoomLink,
                      notes: selectedEvent.notes,
                      recurring: selectedEvent.recurring,
                      recurringDays: selectedEvent.recurringDays || []
                    }}
                    setNewEvent={(event) => setSelectedEvent({ ...selectedEvent, ...event })}
                    students={mockStudents}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditEvent}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
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
            </>
          )}
          
          {!isEditMode && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewEventOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          )}
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
              <Button variant="outline" onClick={() => {
                setIsAddEventOpen(false);
                resetNewEventForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateEvent}>Schedule Class</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorScheduler;
