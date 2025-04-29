
import React from 'react';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import { Form } from '@/components/ui/form';
import {
  TitleField,
  DateField,
  TimeField,
  SubjectField,
  ZoomLinkField,
  NotesField
} from '../forms/ClassFormFields';
import { useEditClassForm } from '@/hooks/tutor-scheduler/useEditClassForm';

interface EditClassFormProps {
  selectedEvent: ClassEvent;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCancel: () => void;
  onSave: () => void;
  students?: any[];
}

const EditClassForm: React.FC<EditClassFormProps> = ({
  selectedEvent,
  newEvent,
  setNewEvent,
  onCancel,
  onSave,
  students,
}) => {
  const { form } = useEditClassForm(selectedEvent, setNewEvent);

  return (
    <div className="py-4">
      <Form {...form}>
        <form className="space-y-4">
          <TitleField form={form} />
          <DateField form={form} />
          <TimeField form={form} name="startTime" label="Start Time" />
          <TimeField form={form} name="endTime" label="End Time" />
          <SubjectField form={form} />
          <ZoomLinkField form={form} />
          <NotesField form={form} />

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
        </form>
      </Form>
    </div>
  );
};

export default EditClassForm;
