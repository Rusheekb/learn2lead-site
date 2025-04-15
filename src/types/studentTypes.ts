import { Database } from "@/integrations/supabase/types";

export type StudentStatus = "active" | "inactive" | "pending";
export type PaymentStatus = "paid" | "unpaid" | "overdue";

export interface Student {
  id: number;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  status: StudentStatus;
  enrollDate: string;
  lastSession: string;
  paymentStatus: PaymentStatus;
}

export interface StudentMessage {
  id: number;
  sender: "student" | "tutor";
  text: string;
  timestamp: string;
}

export interface StudentNote {
  id: number;
  title: string;
  content: string;
  date: string;
}

export interface StudentMessages {
  studentId: number;
  messages: StudentMessage[];
}

export interface StudentNotes {
  studentId: number;
  notes: StudentNote[];
}

export function isValidStudentStatus(status: string): status is StudentStatus {
  return ["active", "inactive", "pending"].includes(status);
}

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ["paid", "unpaid", "overdue"].includes(status);
}

export function validateStudent(data: any): Student {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid student data");
  }

  if (!isValidStudentStatus(data.status)) {
    throw new Error(`Invalid student status: ${data.status}`);
  }

  if (!isValidPaymentStatus(data.paymentStatus)) {
    throw new Error(`Invalid payment status: ${data.paymentStatus}`);
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    grade: data.grade,
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    status: data.status,
    enrollDate: data.enrollDate,
    lastSession: data.lastSession,
    paymentStatus: data.paymentStatus
  };
} 