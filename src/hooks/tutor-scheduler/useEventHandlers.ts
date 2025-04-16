import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ClassEvent } from "@/types/tutorTypes";
import { addDays, format, isBefore } from "date-fns";
import { toast } from "sonner";
import { StudentMessage, StudentUpload } from "@/types/classTypes";
import { 
  createClassLog, 
  updateClassLog, 
  deleteClassLog 
} from "@/services/classLogsService";
import { mockStudents } from "../../components/tutor/mock-data-students";

// Placeholder function that would be replaced with actual API calls
const simulateApiCall = async (): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 500));
};

interface EventHandlersProps {
  scheduledClasses: ClassEvent[];
  setScheduledClasses: React.Dispatch<React.SetStateAction<ClassEvent[]>>;
  selectedEvent: ClassEvent | null;
  setSelectedEvent: React.Dispatch<React.SetStateAction<ClassEvent | null>>;
  isAddEventOpen: boolean;
  setIsAddEventOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isViewEventOpen: boolean;
  setIsViewEventOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  newEvent: any;
  setNewEvent: React.Dispatch<React.SetStateAction<any>>;
}

export const useEventHandlers = ({
  scheduledClasses,
  setScheduledClasses,
  selectedEvent,
  setSelectedEvent,
  isAddEventOpen,
  setIsAddEventOpen,
  isViewEventOpen,
  setIsViewEventOpen,
  isEditMode,
  setIsEditMode,
  newEvent,
  setNewEvent
}: EventHandlersProps) => {
  const [activeEventTab, setActiveEventTab] = useState<string>("details");

  const handleSelectEvent = (event: ClassEvent) => {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    setIsEditMode(false);
  };

  const handleCreateEvent = async (newEvent: any) => {
    try {
      const newClassEvent: ClassEvent = {
        id: String(scheduledClasses.length + 1),
        title: newEvent.title,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        studentId: newEvent.studentId,
        studentName: mockStudents.find(s => s.id === newEvent.studentId)?.name || "",
        subject: newEvent.subject,
        zoomLink: newEvent.zoomLink,
        notes: newEvent.notes,
        recurring: newEvent.recurring,
        recurringDays: newEvent.recurringDays,
        materials: [],
        tutorName: "Current Tutor" // Default value
      };

      const createdEvent = await createClassLog(newClassEvent);
      
      if (createdEvent) {
        setScheduledClasses([...scheduledClasses, createdEvent]);
        toast.success("Class scheduled successfully!");
        return true;
      } else {
        toast.error("Failed to schedule class");
        return false;
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to schedule class");
      return false;
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return false;
    
    try {
      // Convert numeric ID to UUID-like string for database query
      const classId = selectedEvent.id;
      
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
        return true;
      } else {
        toast.error("Failed to update class");
        return false;
      }
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Failed to update class");
      return false;
    }
  };

  const handleDeleteEvent = async (eventId: string, isRecurring: boolean = false) => {
    try {
      const classId = eventId;
      
      if (isRecurring) {
        // In a real app, this would delete all recurring instances
        // For now, we'll just delete this one instance
        const success = await deleteClassLog(classId);
        
        if (success) {
          setScheduledClasses(classes =>
            classes.filter(cls => cls.id !== eventId)
          );
          toast.success("All recurring classes deleted successfully!");
          return true;
        } else {
          toast.error("Failed to delete recurring classes");
          return false;
        }
      } else {
        const success = await deleteClassLog(classId);
        
        if (success) {
          setScheduledClasses(classes =>
            classes.filter(cls => cls.id !== eventId)
          );
          toast.success("Class deleted successfully!");
          setIsViewEventOpen(false);
          return true;
        } else {
          toast.error("Failed to delete class");
          return false;
        }
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
      return false;
    }
  };

  const handleDuplicateEvent = async (event: ClassEvent) => {
    try {
      const duplicatedEvent: ClassEvent = {
        ...event,
        id: String(scheduledClasses.length + 1),
        date: new Date(event.date),
        recurring: false,
        recurringDays: []
      };
      
      const createdEvent = await createClassLog(duplicatedEvent);
      
      if (createdEvent) {
        setScheduledClasses([...scheduledClasses, createdEvent]);
        toast.success("Class duplicated successfully!");
        return true;
      } else {
        toast.error("Failed to duplicate class");
        return false;
      }
    } catch (error) {
      console.error("Error duplicating class:", error);
      toast.error("Failed to duplicate class");
      return false;
    }
  };

  return {
    isEditMode,
    setIsEditMode,
    selectedEvent,
    setSelectedEvent,
    activeEventTab,
    setActiveEventTab,
    handleSelectEvent,
    handleCreateEvent,
    handleEditEvent,
    handleDeleteEvent,
    handleDuplicateEvent
  };
};

export default useEventHandlers;
