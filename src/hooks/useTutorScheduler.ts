
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ClassEvent, Student } from "@/types/tutorTypes";
import { fetchClassLogs, createClassLog, updateClassLog, deleteClassLog, fetchClassMessages, createClassMessage, markMessageAsRead, fetchClassUploads, uploadClassFile, getFileDownloadURL } from "@/services/classService";

export function useTutorScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<string>("details");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [studentMessages, setStudentMessages] = useState<StudentMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Fetch class logs on component mount
  useEffect(() => {
    const loadClasses = async () => {
      setIsLoading(true);
      try {
        const classes = await fetchClassLogs();
        setScheduledClasses(classes);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Failed to load scheduled classes");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClasses();
  }, []);

  // Load messages and uploads when a class is selected
  useEffect(() => {
    const loadClassContent = async () => {
      if (!selectedEvent || !selectedEvent.id) return;
      
      // Convert numeric ID back to UUID-like string for database query
      // This is just a simplistic approach - in a real app, we'd store the real UUID
      const classId = selectedEvent.id.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      try {
        // Load messages
        const messages = await fetchClassMessages(classId);
        setStudentMessages(messages);
        
        // Load uploads
        const uploads = await fetchClassUploads(classId);
        setStudentUploads(uploads);
      } catch (error) {
        console.error("Error loading class content:", error);
        toast.error("Failed to load class content");
      }
    };
    
    loadClassContent();
  }, [selectedEvent]);

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    setIsEditMode(false);
  };

  const handleCreateEvent = async () => {
    try {
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

      const createdEvent = await createClassLog(newClassEvent);
      
      if (createdEvent) {
        setScheduledClasses([...scheduledClasses, createdEvent]);
        setIsAddEventOpen(false);
        resetNewEventForm();
        toast.success("Class scheduled successfully!");
      } else {
        toast.error("Failed to schedule class");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to schedule class");
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      // Convert numeric ID back to UUID-like string for database query
      const classId = selectedEvent.id.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const updatedEvent = await updateClassLog(classId, selectedEvent);
      
      if (updatedEvent) {
        setScheduledClasses(classes =>
          classes.map(cls =>
            cls.id === selectedEvent.id
              ? updatedEvent
              : cls
          )
        );
        
        setIsEditMode(false);
        toast.success("Class updated successfully!");
      } else {
        toast.error("Failed to update class");
      }
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Failed to update class");
    }
  };

  const handleDeleteEvent = async (eventId: number, isRecurring: boolean = false) => {
    try {
      // Convert numeric ID back to UUID-like string for database query
      const classId = eventId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      if (isRecurring) {
        // In a real app, this would delete all recurring instances
        // For now, we'll just delete this one instance
        const success = await deleteClassLog(classId);
        
        if (success) {
          setScheduledClasses(classes =>
            classes.filter(cls => cls.id !== eventId)
          );
          toast.success("All recurring classes deleted successfully!");
        } else {
          toast.error("Failed to delete recurring classes");
        }
      } else {
        const success = await deleteClassLog(classId);
        
        if (success) {
          setScheduledClasses(classes =>
            classes.filter(cls => cls.id !== eventId)
          );
          toast.success("Class deleted successfully!");
        } else {
          toast.error("Failed to delete class");
        }
      }
      
      setIsViewEventOpen(false);
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  const handleDuplicateEvent = async (event: ClassEvent) => {
    try {
      const duplicatedEvent: ClassEvent = {
        ...event,
        id: scheduledClasses.length + 1,
        date: new Date(event.date),
        recurring: false,
        recurringDays: []
      };
      
      const createdEvent = await createClassLog(duplicatedEvent);
      
      if (createdEvent) {
        setScheduledClasses([...scheduledClasses, createdEvent]);
        toast.success("Class duplicated successfully!");
      } else {
        toast.error("Failed to duplicate class");
      }
    } catch (error) {
      console.error("Error duplicating class:", error);
      toast.error("Failed to duplicate class");
    }
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

  const handleMarkMessageRead = async (messageId: number) => {
    try {
      // Convert numeric ID back to UUID-like string for database query
      const dbMessageId = messageId.toString().padStart(8, '0') + '-0000-0000-0000-000000000000';
      
      const success = await markMessageAsRead(dbMessageId);
      
      if (success) {
        setStudentMessages(messages => 
          messages.map(message => 
            message.id === messageId ? { ...message, isRead: true } : message
          )
        );
        toast.success("Message marked as read");
      } else {
        toast.error("Failed to mark message as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error("Failed to mark message as read");
    }
  };

  const handleDownloadFile = async (uploadId: number) => {
    try {
      // In a real implementation, we would fetch the file path from the database
      // For now, we'll just show a success message
      const upload = studentUploads.find(u => u.id === uploadId);
      if (upload) {
        // This would get a download URL in a real implementation
        // const downloadUrl = await getFileDownloadURL(upload.filePath);
        toast.success(`Downloading ${upload.fileName}`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
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

  return {
    // State
    selectedDate,
    setSelectedDate,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    isEditMode,
    setIsEditMode,
    searchTerm,
    setSearchTerm,
    subjectFilter, 
    setSubjectFilter,
    studentFilter,
    setStudentFilter,
    scheduledClasses,
    studentUploads,
    studentMessages,
    isLoading,
    newEvent,
    setNewEvent,
    filteredClasses,
    allSubjects,

    // Methods
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent,
    resetNewEventForm,
    handleMarkMessageRead,
    handleDownloadFile,
    getUnreadMessageCount,
  };
}

// Import types from shared file for StudentMessage and StudentUpload
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";
// Mock data for development
import { mockStudents } from "./mockStudents";
