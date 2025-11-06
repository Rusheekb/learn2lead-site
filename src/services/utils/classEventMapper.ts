
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
  'Class Cost'?: string | number | null;
  'Tutor Cost'?: string | number | null;
  'Student Payment'?: string | null;
  'Tutor Payment'?: string | null;
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
    const startTime = dbRecord['Time (CST)'] || '';
    const endTime = calculateEndTime(startTime, duration);

    // Cast payment statuses using the validators
    const studentPayment = dbRecord['Student Payment'] || 'pending';
    const tutorPayment = dbRecord['Tutor Payment'] || 'pending';

    // Handle null values for parseNumericString
    const classCost = parseNumericString(dbRecord['Class Cost']);
    const tutorCost = parseNumericString(dbRecord['Tutor Cost']);

    return {
      id: dbRecord.id,
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
      studentPayment: isValidPaymentStatus(studentPayment)
        ? studentPayment
        : 'pending',
      tutorPayment: isValidPaymentStatus(tutorPayment)
        ? tutorPayment
        : 'pending',
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
    studentPayment: 'pending' as PaymentStatus,
    tutorPayment: 'pending' as PaymentStatus,
    recurring: false,
    materials: [],
  };
}
