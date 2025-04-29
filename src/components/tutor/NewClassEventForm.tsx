
import React, { useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newClassEventSchema } from '@/utils/classFormUtils';
import { Student } from '@/types/sharedTypes';
import { TutorStudentRelationship } from '@/services/relationships/types';
import StudentSelectField from './forms/StudentSelectField';
import {
  TitleField,
  DateField,
  TimeField,
  SubjectField,
  ZoomLinkField,
  NotesField
} from './forms/ClassFormFields';
import type { z } from 'zod';

const schema = newClassEventSchema();
type ClassEventFormValues = z.infer<typeof schema>;

interface NewClassEventFormProps {
  newEvent: any;
  setNewEvent: (event: any) => void;
  assignedStudents: Student[];
  relationships: TutorStudentRelationship[];
  selectedRelId: string;
  setSelectedRelId: (id: string) => void;
}

const NewClassEventForm: React.FC<NewClassEventFormProps> = ({
  newEvent,
  setNewEvent,
  assignedStudents,
  relationships,
  selectedRelId,
  setSelectedRelId,
}) => {
  const form = useForm<ClassEventFormValues>({
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

  // Optimize the watch subscription with named fields and proper dependency tracking
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

  return (
    <Form {...form}>
      <form className="space-y-4">
        <TitleField form={form} />
        <StudentSelectField form={form} relationships={relationships} assignedStudents={assignedStudents} />
        <DateField form={form} />
        <TimeField form={form} name="startTime" label="Start Time" />
        <TimeField form={form} name="endTime" label="End Time" />
        <SubjectField form={form} />
        <ZoomLinkField form={form} />
        <NotesField form={form} />
      </form>
    </Form>
  );
};

export default NewClassEventForm;
