
import { useState, useEffect } from 'react';
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
  });

  // Subscribe to form changes
  useEffect(() => {
    // Track the previous form values to avoid unnecessary updates
    const subscription = form.watch((formValues) => {
      if (!formValues) return;
      
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
    setNewEvent,
    newEvent,
    relationships,
    assignedStudents,
    selectedRelId,
    setSelectedRelId
  ]);

  return { form };
};

