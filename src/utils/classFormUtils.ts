
import * as z from 'zod';
import { addMinutes } from 'date-fns';

// Define the base schema without refinement
const createBaseSchema = () => {
  return z.object({
    title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
    date: z.date({ required_error: 'Please select a date' }),
    startTime: z.string().min(1, { message: 'Start time is required' }),
    endTime: z.string().min(1, { message: 'End time is required' }),
    subject: z.string().min(1, { message: 'Subject is required' }),
    zoomLink: z.string()
      .url({ message: 'Please enter a valid URL' })
      .min(1, { message: 'Zoom link is required' }),
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
  }).refine((data) => {
    // Check if the combined date and start time is in the future
    const now = new Date();
    const startDateTime = new Date(data.date);
    const [hours, minutes] = data.startTime.split(':').map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    return startDateTime > now;
  }, {
    message: 'Class time must be in the future',
    path: ['startTime'],
  });
};

// Schema for new class events that includes relationship ID
export const newClassEventSchema = () => {
  // Create a new base schema and add the relationshipId field
  const extendedSchema = createBaseSchema().extend({
    relationshipId: z.string().min(1, { message: 'Please select a student' }),
  });
  
  // Add the same refinements as createClassEventSchema
  return extendedSchema.refine((data) => {
    return data.startTime < data.endTime;
  }, {
    message: 'End time must be after start time',
    path: ['endTime'],
  }).refine((data) => {
    // Check if the combined date and start time is in the future
    const now = new Date();
    const startDateTime = new Date(data.date);
    const [hours, minutes] = data.startTime.split(':').map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    return startDateTime > now;
  }, {
    message: 'Class time must be in the future',
    path: ['startTime'],
  });
};

// Schema for edit class events
export const editClassEventSchema = createClassEventSchema;
