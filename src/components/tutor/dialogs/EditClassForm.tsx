
import React from 'react';
import { Button } from '@/components/ui/button';
import { ClassEvent } from '@/types/tutorTypes';
import { Form } from '@/components/ui/form';
import FormFieldsGroup from '../forms/FormFieldsGroup';
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
    <div className="py-4 space-y-6 w-full">
      <Form {...form}>
        <form className="space-y-6 w-full">
          <FormFieldsGroup form={form} />

          <div className="flex justify-end gap-3 mt-8">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
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
