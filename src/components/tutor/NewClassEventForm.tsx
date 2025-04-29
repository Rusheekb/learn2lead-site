
import React from 'react';
import { Form } from '@/components/ui/form';
import { Student } from '@/types/sharedTypes';
import { TutorStudentRelationship } from '@/services/relationships/types';
import StudentSelectField from './forms/StudentSelectField';
import FormFieldsGroup from './forms/FormFieldsGroup';
import { useNewClassEventForm } from '@/hooks/tutor-scheduler/useNewClassEventForm';

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
  const { form } = useNewClassEventForm(
    newEvent, 
    setNewEvent, 
    relationships, 
    assignedStudents, 
    selectedRelId, 
    setSelectedRelId
  );

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormFieldsGroup form={form} />
        <StudentSelectField 
          form={form} 
          relationships={relationships} 
          assignedStudents={assignedStudents} 
        />
      </form>
    </Form>
  );
};

export default NewClassEventForm;
