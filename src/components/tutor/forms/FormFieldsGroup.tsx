
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  TitleField,
  DateField,
  TimeField,
  SubjectField,
  ZoomLinkField,
  NotesField
} from './ClassFormFields';

interface FormFieldsGroupProps {
  form: UseFormReturn<any, any, any>;
}

const FormFieldsGroup: React.FC<FormFieldsGroupProps> = ({ form }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <TitleField form={form} />
      <DateField form={form} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <TimeField form={form} name="startTime" label="Start Time" />
        <TimeField form={form} name="endTime" label="End Time" />
      </div>
      <SubjectField form={form} />
      <ZoomLinkField form={form} />
      <NotesField form={form} />
    </div>
  );
};

export default FormFieldsGroup;
