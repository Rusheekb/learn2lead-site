
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import NewClassEventForm from '../NewClassEventForm';
import type { TutorStudentRelationship } from '@/services/relationships/types';

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
  // Since we're editing an existing event, we can create empty relationships
  // and selectedRelId since they aren't used for editing, just for creating new events
  const [relationships, setRelationships] = useState<TutorStudentRelationship[]>([]);
  const [selectedRelId, setSelectedRelId] = useState<string>('');

  return (
    <div className="py-4">
      <NewClassEventForm
        newEvent={{
          title: selectedEvent.title,
          date:
            typeof selectedEvent.date === 'string'
              ? new Date(selectedEvent.date)
              : selectedEvent.date,
          startTime: selectedEvent.startTime || '',
          endTime: selectedEvent.endTime || '',
          studentId: selectedEvent.studentId || '',
          subject: selectedEvent.subject || '',
          zoomLink: selectedEvent.zoomLink || '',
          notes: selectedEvent.notes || '',
          tutorId: selectedEvent.tutorId || '',
          recurring: selectedEvent.recurring || false,
          recurringDays: selectedEvent.recurringDays || [],
        }}
        setNewEvent={(event) => setNewEvent({ ...selectedEvent, ...event })}
        students={students}
        relationships={relationships}
        selectedRelId={selectedRelId}
        setSelectedRelId={setSelectedRelId}
      />
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          className="bg-tutoring-blue hover:bg-tutoring-blue/90"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default EditClassForm;
