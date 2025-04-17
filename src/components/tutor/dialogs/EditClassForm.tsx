
import React from "react";
import { Button } from "@/components/ui/button";
import { ClassEvent } from "@/types/tutorTypes";
import NewClassEventForm from "../NewClassEventForm";

interface EditClassFormProps {
  selectedEvent: ClassEvent;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCancel: () => void;
  onSave: () => void;
  students: any[];
}

const EditClassForm: React.FC<EditClassFormProps> = ({
  selectedEvent,
  newEvent,
  setNewEvent,
  onCancel,
  onSave,
  students,
}) => {
  return (
    <div className="py-4">
      <NewClassEventForm 
        newEvent={{
          title: selectedEvent.title,
          date: typeof selectedEvent.date === 'string' ? new Date(selectedEvent.date) : selectedEvent.date,
          startTime: selectedEvent.startTime,
          endTime: selectedEvent.endTime,
          studentId: selectedEvent.studentId || '',
          subject: selectedEvent.subject,
          zoomLink: selectedEvent.zoomLink || '',
          notes: selectedEvent.notes || '',
          tutorId: selectedEvent.tutorId,
          recurring: selectedEvent.recurring,
          recurringDays: selectedEvent.recurringDays || []
        }}
        setNewEvent={(event) => setNewEvent({ ...selectedEvent, ...event })}
        students={students}
      />
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} className="bg-tutoring-blue hover:bg-tutoring-blue/90">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default EditClassForm;
