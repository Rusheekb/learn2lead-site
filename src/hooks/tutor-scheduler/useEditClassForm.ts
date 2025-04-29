
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editClassEventSchema } from '@/utils/classFormUtils';
import { ClassEvent } from '@/types/tutorTypes';
import type { z } from 'zod';

const schema = editClassEventSchema();
export type EditClassFormValues = z.infer<typeof schema>;

export const useEditClassForm = (
  selectedEvent: ClassEvent,
  setNewEvent: (event: any) => void
) => {
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

  // Subscribe to form changes
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

  return { form };
};

