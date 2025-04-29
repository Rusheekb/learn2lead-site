
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { editClassEventSchema } from '@/utils/classFormUtils';
import {
  TitleField,
  DateField,
  TimeField,
  SubjectField,
  ZoomLinkField,
  NotesField
} from '../forms/ClassFormFields';
import type { z } from 'zod';

interface EditClassFormProps {
  selectedEvent: ClassEvent;
  newEvent: any;
  setNewEvent: (event: any) => void;
  onCancel: () => void;
  onSave: () => void;
  students?: any[];
}

const schema = editClassEventSchema();
type EditClassFormValues = z.infer<typeof schema>;

const EditClassForm: React.FC<EditClassFormProps> = ({
  selectedEvent,
  newEvent,
  setNewEvent,
  onCancel,
  onSave,
  students,
}) => {
  // Parse the date from string if needed
  const eventDate = typeof selectedEvent.date === 'string' 
    ? new Date(selectedEvent.date) 
    : selectedEvent.date;

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: selectedEvent.title,
      date: eventDate,
      startTime: selectedEvent.startTime || '',
      endTime: selectedEvent.endTime || '',
      subject: selectedEvent.subject || '',
      zoomLink: selectedEvent.zoomLink || '',
      notes: selectedEvent.notes || '',
    },
  });

  // Optimize the watch subscription with named fields and memoized handler
  useEffect(() => {
    // Watch only the fields we need to update in parent state
    const subscription = form.watch((formValues) => {
      // Only update if values have changed
      if (formValues && Object.keys(formValues).some(key => formValues[key as keyof EditClassFormValues] !== selectedEvent[key as keyof ClassEvent])) {
        setNewEvent({
          ...selectedEvent,
          ...formValues,
        });
      }
    });
    
    // Properly clean up subscription
    return () => subscription.unsubscribe();
  }, [form.watch, selectedEvent, setNewEvent]);

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
