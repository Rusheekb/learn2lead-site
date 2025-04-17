
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ClassEvent } from "@/types/tutorTypes";
import { fetchScheduledClasses } from "@/services/classService";
import { fetchTutorStudents } from "@/services/tutorService";
import { supabase } from "@/integrations/supabase/client";

export const useSchedulerData = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scheduledClasses, setScheduledClasses] = useState<ClassEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState<boolean>(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState<boolean>(false);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [myStudents, setMyStudents] = useState<{id: string, name: string}[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: new Date(),
    startTime: "09:00",
    endTime: "10:00",
    studentId: "",
    subject: "",
    zoomLink: "",
    notes: "",
    tutorId: ""
  });

  // Get current user and fetch their tutor profile
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is a tutor
        const { data, error } = await supabase
          .from('tutors')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
          
        if (data?.id) {
          setTutorId(data.id);
          
          // Update newEvent with tutorId
          setNewEvent(prev => ({ 
            ...prev, 
            tutorId: data.id 
          }));
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch class logs on component mount
  useEffect(() => {
    if (!tutorId) return;
    
    const loadClasses = async () => {
      setIsLoading(true);
      try {
        // Fetch scheduled classes for this tutor
        const classes = await fetchScheduledClasses(tutorId);
        setScheduledClasses(classes);
        
        // Extract unique subjects
        const subjects = Array.from(new Set(classes.map(cls => cls.subject))).filter(Boolean);
        setAllSubjects(subjects);
        
        // Load tutor's students
        const students = await fetchTutorStudents(tutorId);
        setMyStudents(students.map(s => ({ id: s.student_id, name: s.student_name })));
        
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Failed to load scheduled classes");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClasses();
  }, [tutorId]);

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
      tutorId: tutorId || ""
    });
  };

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
    resetNewEventForm,
    myStudents,
    tutorId
  };
};

export default useSchedulerData;
