
export interface ClassEvent {
  id: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  studentId: number;
  studentName: string;
  subject: string;
  zoomLink: string;
  materials?: string[];
  notes?: string;
  recurring: boolean;
  recurringDays?: string[];
}

export interface Student {
  id: number;
  name: string;
  subjects: string[];
}
