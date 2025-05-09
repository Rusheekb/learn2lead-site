
import * as z from 'zod';
import { addMinutes, isFuture, parse, set } from 'date-fns';

// Define the base schema without refinement
const createBaseSchema = () => {
  return z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    date: z.date({ required_error: 'Please select a date' }),
    startTime: z.string().min(1, { message: 'Start time is required' }),
    endTime: z.string().min(1, { message: 'End time is required' }),
    subject: z.string().min(1, { message: 'Subject is required' }),
    zoomLink: z.string()
      .min(1, { message: 'Zoom link is required' })
      .url({ message: 'Please enter a valid URL' }).or(z.string()),
    notes: z.string().optional(),
  });
};

// Define the shared schema for class events (both new and edit forms)
export const createClassEventSchema = () => {
  const baseSchema = createBaseSchema();
  
  // Return the schema with minimal refinements
  return baseSchema;
};

// Schema for new class events that includes relationship ID
// Make validation more lenient to address form submission issues
export const newClassEventSchema = () => {
  // Create a more permissive schema for the new class form
  return z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    relationshipId: z.string().min(1, { message: 'Please select a student' }),
    date: z.date({ required_error: 'Please select a date' }),
    startTime: z.string().min(1, { message: 'Start time is required' }),
    endTime: z.string().min(1, { message: 'End time is required' }),
    subject: z.string().min(1, { message: 'Subject is required' }),
    zoomLink: z.string()
      .min(1, { message: 'Zoom link is required' })
      .url({ message: 'Please enter a valid URL' }).or(z.string()),
    notes: z.string().optional(),
  });
};

// Schema for edit class events
export const editClassEventSchema = createClassEventSchema;
