
import * as z from 'zod';

// Define the shared schema for class events (both new and edit forms)
export const createClassEventSchema = () => {
  return z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    date: z.date({ required_error: 'Please select a date' }),
    startTime: z.string().min(1, { message: 'Start time is required' }),
    endTime: z.string().min(1, { message: 'End time is required' }),
    subject: z.string().min(1, { message: 'Subject is required' }),
    zoomLink: z.string().url({ message: 'Please enter a valid URL' }).or(z.string().length(0)),
    notes: z.string().optional(),
  }).refine((data) => {
    return data.startTime < data.endTime;
  }, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
};

// Schema for new class events that includes relationship ID
export const newClassEventSchema = () => {
  const baseSchema = createClassEventSchema();
  return baseSchema.extend({
    relationshipId: z.string().min(1, { message: 'Please select a student' }),
  });
};

// Schema for edit class events
export const editClassEventSchema = createClassEventSchema;
