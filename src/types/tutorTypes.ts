
export interface ClassEvent {
  id: string;
  title: string;
  tutorName: string;
  studentName: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  duration?: number;
  subject: string;
  content?: string;
  homework?: string;
  status?: string;
  attendance?: string;
  zoomLink: string | null;
  notes: string | null;
  classCost?: number;
  tutorCost?: number;
  studentPayment?: string;
  tutorPayment?: string;
  isCodeLog?: boolean;
  
  // Add properties needed by Tutor components
  recurring?: boolean;
  recurringDays?: string[];
  studentId?: string;
  tutorId?: string;
  materials?: string[];
  paymentStatus?: string;
  tutorPaymentStatus?: string;
}

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

export interface Student {
  id: string;
  name: string;
  subjects: string[];
  email?: string;
  lastSession?: string;
  nextSession?: string;
  progress?: string;
}

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
