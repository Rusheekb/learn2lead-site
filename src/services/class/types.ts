
import { ClassStatus, AttendanceStatus } from '@/types/tutorTypes';

export interface ScheduledClass {
  id: string;
  title: string;
  tutor_id: string;
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  zoom_link: string | null;
  notes: string | null;
  status: string;
  attendance: string | null;
  created_at: string;
  updated_at: string;
  tutor_name?: string;
  student_name?: string;
}

// Define profile type to match what comes back from Supabase
export interface Profile {
  id: string; // Added id property
  first_name: string | null;
  last_name: string | null;
}

