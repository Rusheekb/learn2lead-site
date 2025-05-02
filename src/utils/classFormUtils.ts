
import * as z from 'zod';

// Define the base schema without refinement
const createBaseSchema = () => {
  return z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    date: z.date({ required_error: 'Please select a date' }),
    startTime: z.string().min(1, { message: 'Start time is required' }),
    endTime: z.string().min(1, { message: 'End time is required' }),
    subject: z.string().min(1, { message: 'Subject is required' }),
    zoomLink: z.string().url({ message: 'Please enter a valid URL' }).min(1, { message: 'Zoom link is required' }),
    notes: z.string().optional(),
  });
};

// Define the shared schema for class events (both new and edit forms)
export const createClassEventSchema = () => {
  const baseSchema = createBaseSchema();
  
  // Return the schema with refinement
  return baseSchema.refine((data) => {
    return data.startTime < data.endTime;
  }, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
};

// Schema for new class events that includes relationship ID
export const newClassEventSchema = () => {
  // Create a new base schema and add the relationshipId field
  const extendedSchema = createBaseSchema().extend({
    relationshipId: z.string().min(1, { message: 'Please select a student' }),
  });
  
  // Add the same refinement as createClassEventSchema
  return extendedSchema.refine((data) => {
    return data.startTime < data.endTime;
  }, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
};

// Schema for edit class events
export const editClassEventSchema = createClassEventSchema;
