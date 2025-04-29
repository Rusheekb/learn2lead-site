
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

  // Watch for form changes and update parent state
  useEffect(() => {
    const subscription = form.watch((value: Partial<ClassEventFormValues>) => {
      const selectedRel = relationships.find(r => r.id === value.relationshipId);
      const student = assignedStudents.find(s => s.id === selectedRel?.student_id);
      
      setNewEvent({
        ...newEvent,
        title: value.title,
        date: value.date,
        startTime: value.startTime,
        endTime: value.endTime,
        studentId: selectedRel?.student_id || '',
        studentName: student?.name || '',
        subject: value.subject,
        zoomLink: value.zoomLink,
        notes: value.notes,
      });

      if (value.relationshipId !== selectedRelId) {
        setSelectedRelId(value.relationshipId || '');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, setNewEvent, newEvent, relationships, assignedStudents, selectedRelId, setSelectedRelId]);

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
