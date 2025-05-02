
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
    <>
      <TitleField form={form} />
      <DateField form={form} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeField form={form} name="startTime" label="Start Time" />
        <TimeField form={form} name="endTime" label="End Time" />
      </div>
      <SubjectField form={form} />
      <ZoomLinkField form={form} />
      <NotesField form={form} />
    </>
  );
};

export default FormFieldsGroup;
