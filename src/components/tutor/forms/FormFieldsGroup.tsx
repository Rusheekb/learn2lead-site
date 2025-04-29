
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
      <TimeField form={form} name="startTime" label="Start Time" />
      <TimeField form={form} name="endTime" label="End Time" />
      <SubjectField form={form} />
      <ZoomLinkField form={form} />
      <NotesField form={form} />
    </>
  );
};

export default FormFieldsGroup;
