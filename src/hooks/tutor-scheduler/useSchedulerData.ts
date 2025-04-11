
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchClassLogs } from "@/services/classService";
import { ClassEvent } from "@/types/tutorTypes";

export const useSchedulerData = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState<boolean>(false);
  
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

  // Extract unique subjects for filter
  const allSubjects = Array.from(new Set(scheduledClasses.map(cls => cls.subject))).sort();

  return {
    selectedDate,
    setSelectedDate,
    isLoading,
    scheduledClasses,
    setScheduledClasses,
    isAddEventOpen,
    setIsAddEventOpen,
    isViewEventOpen,
    setIsViewEventOpen,
    newEvent,
    setNewEvent,
    allSubjects,
    resetNewEventForm
  };
};

export default useSchedulerData;
