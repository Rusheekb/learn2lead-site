
import { Database } from '@/integrations/supabase/types';

// Define the column names as they appear in the database
export type DbClassLog = Database['public']['Tables']['class_logs']['Row'];
export type InsertDbClassLog = Database['public']['Tables']['class_logs']['Insert'];
export type UpdateDbClassLog = Database['public']['Tables']['class_logs']['Update'];

// Define a type for code logs since it's not in the database type definitions
export interface DbCodeLog {
  id: string;
  class_number: string | null;
  tutor_name: string | null;
  student_name: string | null;
  date: string | null;
  day: string | null;
  time_cst: string | null;
  time_hrs: string | null;
  subject: string | null;
  content: string | null;
  hw: string | null;
  class_id: string | null;
  class_cost: string | null;
  tutor_cost: string | null;
  student_payment: string | null;
  tutor_payment: string | null;
  additional_info: string | null;
}

export interface TransformedClassLog {
  id: string;
  classNumber: string;
  tutorName: string;
  studentName: string;
  date: Date;
  day: string;
  startTime: string;
  duration: number;
  subject: string;
  content: string;
  homework: string;
  classId: string;
  classCost: number;
  tutorCost: number;
  studentPayment: string;
  tutorPayment: string;
  additionalInfo: string | null;
  isCodeLog: boolean;
  // Add these to match ClassEvent interface
  title?: string;
  endTime?: string;
  zoomLink?: string | null;
  notes?: string | null;
}
