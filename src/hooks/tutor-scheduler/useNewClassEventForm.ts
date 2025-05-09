
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newClassEventSchema } from '@/utils/classFormUtils';
import { Student } from '@/types/sharedTypes';
import { TutorStudentRelationship } from '@/services/relationships/types';
import type { z } from 'zod';

const schema = newClassEventSchema();
export type NewClassFormValues = z.infer<typeof schema>;

export const useNewClassEventForm = (
  newEvent: any,
  setNewEvent: (event: any) => void,
  relationships: TutorStudentRelationship[],
  assignedStudents: Student[],
  selectedRelId: string,
  setSelectedRelId: (id: string) => void
) => {
  // Initialize the form with default values
  const form = useForm<NewClassFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: newEvent.title || '',
      relationshipId: selectedRelId || '',
      date: newEvent.date || new Date(),
      startTime: newEvent.startTime || '',
      endTime: newEvent.endTime || '',
      subject: newEvent.subject || '',
      zoomLink: newEvent.zoomLink || '',
      notes: newEvent.notes || '',
    },
    mode: 'onChange',
  });

  // Mark the form as dirty initially to make submit button active
  useEffect(() => {
    if (newEvent) {
      // Instead of directly modifying formState.dirtyFields, use setValue with shouldDirty=true
      Object.keys(form.getValues()).forEach(key => {
        // Get the current value from the form
        const currentValue = form.getValues(key as keyof NewClassFormValues);
        // Reset the same value but with shouldDirty=true to mark field as dirty
        form.setValue(key as keyof NewClassFormValues, currentValue, { 
          shouldDirty: true,
          shouldValidate: true
        });
      });
    }
  }, []);
  
  // Use useEffect to update the form when the newEvent changes
  useEffect(() => {
    if (newEvent) {
      // Keep a reference to the current form values to prevent unnecessary updates
      const currentValues = form.getValues();
      
      // Update title only if changed and not empty
      if (newEvent.title && newEvent.title !== currentValues.title) {
        form.setValue('title', newEvent.title, { shouldDirty: true, shouldValidate: true });
      }
      
      // Update relationshipId only if changed and not empty
      if (selectedRelId && selectedRelId !== currentValues.relationshipId) {
        form.setValue('relationshipId', selectedRelId, { shouldDirty: true, shouldValidate: true });
      }
      
      // Update subject only if changed and not empty
      if (newEvent.subject && newEvent.subject !== currentValues.subject) {
        form.setValue('subject', newEvent.subject, { shouldDirty: true, shouldValidate: true });
      }
      
      // Update zoomLink only if changed and not empty
      if (newEvent.zoomLink && newEvent.zoomLink !== currentValues.zoomLink) {
        form.setValue('zoomLink', newEvent.zoomLink, { shouldDirty: true, shouldValidate: true });
      }
      
      // Update notes only if changed
      if (newEvent.notes && newEvent.notes !== currentValues.notes) {
        form.setValue('notes', newEvent.notes, { shouldDirty: true });
      }
      
      // Update startTime only if changed and not empty
      if (newEvent.startTime && newEvent.startTime !== currentValues.startTime) {
        form.setValue('startTime', newEvent.startTime, { shouldDirty: true, shouldValidate: true });
      }
      
      // Update endTime only if changed and not empty
      if (newEvent.endTime && newEvent.endTime !== currentValues.endTime) {
        form.setValue('endTime', newEvent.endTime, { shouldDirty: true, shouldValidate: true });
      }
      
      // Update date if it exists and has changed
      if (newEvent.date && 
          (!currentValues.date || 
           newEvent.date.getTime() !== currentValues.date.getTime())) {
        form.setValue('date', newEvent.date, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [form, newEvent, selectedRelId]);

  // Subscribe to form changes
  useEffect(() => {
    const subscription = form.watch((formValues, { name, type }) => {
      if (!formValues) return;
      
      // Only update if the field has changed
      if (!name) return;
      
      // Handle relationship change separately to optimize student lookup
      const relationshipId = formValues.relationshipId;
      if (relationshipId !== selectedRelId) {
        setSelectedRelId(relationshipId || '');
      }
      
      // Only lookup student if relationship has changed
      const selectedRel = relationships.find(r => r.id === relationshipId);
      const student = selectedRel ? 
        assignedStudents.find(s => s.id === selectedRel.student_id) : 
        undefined;
      
      // Create a new object to avoid mutating the newEvent directly
      const updatedEvent = {
        ...newEvent,
        title: formValues.title || newEvent.title,
        date: formValues.date || newEvent.date,
        startTime: formValues.startTime || newEvent.startTime,
        endTime: formValues.endTime || newEvent.endTime,
        studentId: selectedRel?.student_id || newEvent.studentId || '',
        studentName: student?.name || newEvent.studentName || '',
        subject: formValues.subject || newEvent.subject,
        zoomLink: formValues.zoomLink || newEvent.zoomLink,
        notes: formValues.notes || newEvent.notes,
        relationshipId: relationshipId || '', // Add relationshipId to the event
      };
      
      // Only update if there are actual changes
      if (JSON.stringify(updatedEvent) !== JSON.stringify(newEvent)) {
        setNewEvent(updatedEvent);
      }
    });
    
    // Properly clean up subscription
    return () => subscription.unsubscribe();
  }, [
    form.watch,
    setNewEvent,
    newEvent,
    relationships,
    assignedStudents,
    selectedRelId,
    setSelectedRelId
  ]);

  return { form };
};
