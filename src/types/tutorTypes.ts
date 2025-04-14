export interface ClassEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  studentName: string;
  tutorName: string;
  subject: string;
  zoomLink?: string | null;
  notes?: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  attendance?: string | null;
  paymentStatus: 'completed' | 'pending';
  tutorPaymentStatus: 'completed' | 'pending';
  classCost: number;
  tutorCost: number;
}

export interface Student {
  id: number;
  name: string;
  subjects: string[];
}
