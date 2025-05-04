
// Common status and payment types
export type ClassStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending';
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused'
  | 'pending';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending' | 'overdue';

// Base interface for shared properties
interface BaseEvent {
  id: string;
  title: string;
  date: string | Date;
  notes: string | null;
}

// Class event interface
export interface ClassEvent extends BaseEvent {
  tutorId?: string;
  tutorName?: string;
  studentId?: string;
  studentName?: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  subject: string;
  zoomLink?: string | null;
  notes: string | null; // Changed from string | null | undefined to match BaseEvent
  status?: ClassStatus;
  attendance?: AttendanceStatus;
  materials?: string[] | null;
  materialsUrl?: string[] | null;
  recurring?: boolean;
  recurringDays?: string[];
  // Add missing properties to fix type errors
  duration?: number;
  content?: string;
  homework?: string;
  classCost?: number;
  tutorCost?: number;
  studentPayment?: PaymentStatus;
  tutorPayment?: PaymentStatus;
  isCodeLog?: boolean;
}

// Database class log record
export interface DbClassLog {
  id: string;
  class_number: string;
  tutor_name: string;
  student_name: string;
  date: string;
  time_cst: string;
  time_hrs: number;
  subject: string;
  content?: string;
  hw?: string;
  class_cost?: number;
  tutor_cost?: number;
  student_payment?: string;
  tutor_payment?: string;
  additional_info?: string;
}

// Student interface - updated to match the database schema
export interface Student {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  lastSession?: string;
  nextSession?: string;
  progress?: string;
  grade?: string | null; // Updated to allow null
  active?: boolean;
  enrollmentDate?: string;
  paymentStatus?: PaymentStatus;
}

// Material interface
export interface Material {
  id: string;
  name: string;
  type: string;
  subject: string;
  dateUploaded: string;
  uploadDate?: string;
  size: string;
  sharedWith: string[];
}

// Tutor interface - updated to align with database fields
export interface Tutor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  rating?: number;
  classes?: number;
  hourlyRate?: number;
  active?: boolean;
}

// Content sharing interface - updated to match sharedTypes.ts
export interface ContentShareItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  content_type: string | null;
  shared_at: string;
  viewed_at: string | null;
}

// Type guards
export const isValidClassStatus = (status: string): status is ClassStatus => {
  return ['scheduled', 'completed', 'cancelled', 'pending'].includes(status);
};

export const isValidAttendanceStatus = (
  status: string
): status is AttendanceStatus => {
  return ['present', 'absent', 'late', 'excused', 'pending'].includes(status);
};

export const isValidPaymentStatus = (
  status: string
): status is PaymentStatus => {
  return ['paid', 'unpaid', 'pending', 'overdue'].includes(status);
};
