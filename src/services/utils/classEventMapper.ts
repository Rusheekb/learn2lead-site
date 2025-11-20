
import {
  ClassEvent,
  ClassStatus,
  AttendanceStatus,
  PaymentStatus,
  isValidClassStatus,
  isValidAttendanceStatus,
  isValidPaymentStatus,
} from '@/types/tutorTypes';
import {
  calculateEndTime,
  parseDateWithFormats,
} from '@/services/utils/dateTimeTransformers';
import { parseNumericString } from '@/utils/numberUtils';
import { parseStartTime } from './timeFormatUtils';

interface DbRecord {
  id: string;
  'Class Number'?: string | null;
  'Tutor Name'?: string | null;
  'Student Name'?: string | null;
  Date?: string | null;
  'Time (CST)'?: string | null;
  'Time (hrs)'?: string | number | null;
  Subject?: string | null;
  Content?: string | null;
  HW?: string | null;
  'Class Cost'?: number | null;
  'Tutor Cost'?: number | null;
  student_payment_date?: string | Date | null;
  tutor_payment_date?: string | Date | null;
  'Additional Info'?: string | null;
}

export const transformDbRecordToClassEvent = (record: unknown): ClassEvent => {
  // Type guard to ensure we have a valid record
  if (!record || typeof record !== 'object' || !('id' in record)) {
    console.error('Invalid record format:', record);
    return createErrorClassEvent('unknown');
  }
  
  const dbRecord = record as DbRecord;
  try {
    let dateObj: Date;

    if (dbRecord.Date) {
      try {
        dateObj = parseDateWithFormats(dbRecord.Date);
      } catch (e) {
        console.error('Error parsing date:', dbRecord.Date, e);
        dateObj = new Date();
      }
    } else {
      dateObj = new Date();
    }

    const duration = parseNumericString(dbRecord['Time (hrs)']);
    const rawStartTime = dbRecord['Time (CST)'] || '';
    const startTime = parseStartTime(rawStartTime);
    const endTime = calculateEndTime(startTime, duration);

    // Parse payment dates
    const studentPaymentDate = dbRecord.student_payment_date 
      ? (typeof dbRecord.student_payment_date === 'string' 
          ? new Date(dbRecord.student_payment_date) 
          : dbRecord.student_payment_date)
      : null;

    const tutorPaymentDate = dbRecord.tutor_payment_date 
      ? (typeof dbRecord.tutor_payment_date === 'string' 
          ? new Date(dbRecord.tutor_payment_date) 
          : dbRecord.tutor_payment_date)
      : null;

    // Derive payment status from dates
    const studentPayment = studentPaymentDate ? 'paid' : 'unpaid';
    const tutorPayment = tutorPaymentDate ? 'paid' : 'unpaid';

    // Costs are already numeric from the database
    const classCost = dbRecord['Class Cost'] ?? 0;
    const tutorCost = dbRecord['Tutor Cost'] ?? 0;

    return {
      id: dbRecord.id,
      classNumber: dbRecord['Class Number'] || '',
      title: dbRecord['Class Number'] || '',
      tutorName: dbRecord['Tutor Name'] || '',
      studentName: dbRecord['Student Name'] || '',
      date: dateObj,
      startTime,
      endTime,
      duration,
      subject: dbRecord.Subject || '',
      content: dbRecord.Content || '',
      homework: dbRecord.HW || '',
      status: 'completed' as ClassStatus,
      attendance: 'present' as AttendanceStatus,
      zoomLink: '',
      notes: dbRecord['Additional Info'] || '',
      classCost,
      tutorCost,
      studentPaymentDate,
      tutorPaymentDate,
      studentPayment: studentPayment as PaymentStatus,
      tutorPayment: tutorPayment as PaymentStatus,
      recurring: false,
      materials: [],
    };
  } catch (error) {
    console.error('Error transforming record:', error, dbRecord);
    return createErrorClassEvent(dbRecord.id);
  }
};

// Helper function to create error class event
function createErrorClassEvent(id: string): ClassEvent {
  return {
    id: id || 'unknown',
    title: 'Error Loading',
    tutorName: 'Error Loading',
    studentName: 'Error Loading',
    date: new Date(),
    startTime: '',
    endTime: '',
    duration: 0,
    subject: 'Error Loading',
    content: 'Error loading content',
    homework: '',
    status: 'pending' as ClassStatus,
    attendance: 'pending' as AttendanceStatus,
    zoomLink: '',
    notes: 'Error loading class data',
    classCost: 0,
    tutorCost: 0,
    studentPaymentDate: null,
    tutorPaymentDate: null,
    studentPayment: 'pending' as PaymentStatus,
    tutorPayment: 'pending' as PaymentStatus,
    recurring: false,
    materials: [],
  };
}
