
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
    mode: 'onChange', // Validate on change for more immediate feedback
  });

  // Use useEffect to update the form when the newEvent changes
  // This prevents the input values from disappearing
  useEffect(() => {
    if (newEvent) {
      // Only update form values if they're different from current form values
      // to prevent focus loss and cursor jumping
      const currentValues = form.getValues();
      
      if (newEvent.title && newEvent.title !== currentValues.title) {
        form.setValue('title', newEvent.title, { shouldDirty: true, shouldValidate: false });
      }
      
      if (selectedRelId && selectedRelId !== currentValues.relationshipId) {
        form.setValue('relationshipId', selectedRelId, { shouldDirty: true, shouldValidate: false });
      }
      
      if (newEvent.subject && newEvent.subject !== currentValues.subject) {
        form.setValue('subject', newEvent.subject, { shouldDirty: true, shouldValidate: false });
      }
      
      if (newEvent.zoomLink && newEvent.zoomLink !== currentValues.zoomLink) {
        form.setValue('zoomLink', newEvent.zoomLink, { shouldDirty: true, shouldValidate: false });
      }
      
      if (newEvent.notes && newEvent.notes !== currentValues.notes) {
        form.setValue('notes', newEvent.notes, { shouldDirty: true, shouldValidate: false });
      }
      
      if (newEvent.startTime && newEvent.startTime !== currentValues.startTime) {
        form.setValue('startTime', newEvent.startTime, { shouldDirty: true, shouldValidate: false });
      }
      
      if (newEvent.endTime && newEvent.endTime !== currentValues.endTime) {
        form.setValue('endTime', newEvent.endTime, { shouldDirty: true, shouldValidate: false });
      }
    }
  }, [form, newEvent, selectedRelId]);

  // Subscribe to form changes
  useEffect(() => {
    // Track the previous form values to avoid unnecessary updates
    const subscription = form.watch((formValues) => {
      if (!formValues) return;
      
      // Only update if user has actually interacted with the form
      if (!form.formState.isDirty) return;
      
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
        
      // Update parent state with new values
      setNewEvent({
        ...newEvent,
        title: formValues.title,
        date: formValues.date,
        startTime: formValues.startTime,
        endTime: formValues.endTime,
        studentId: selectedRel?.student_id || '',
        studentName: student?.name || '',
        subject: formValues.subject,
        zoomLink: formValues.zoomLink,
        notes: formValues.notes,
      });
    });
    
    // Properly clean up subscription
    return () => subscription.unsubscribe();
  }, [
    form.watch, 
    form.formState.isDirty,
    setNewEvent,
    newEvent,
    relationships,
    assignedStudents,
    selectedRelId,
    setSelectedRelId
  ]);

  return { form };
};
