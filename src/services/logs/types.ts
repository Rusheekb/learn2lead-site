import { Database } from '@/integrations/supabase/types';

export type DbClassLog = Database['public']['Tables']['class_logs']['Row'];
export type InsertDbClassLog = Database['public']['Tables']['class_logs']['Insert'];
export type UpdateDbClassLog = Database['public']['Tables']['class_logs']['Update'];

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
} 