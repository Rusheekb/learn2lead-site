
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
  parseNumericString,
  calculateEndTime,
  parseDateWithFormats,
} from './dateTimeTransformers';

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

export const transformDbRecordToClassEvent = (record: DbRecord): ClassEvent => {
  try {
    let dateObj: Date;

    if (record.Date) {
      try {
        dateObj = parseDateWithFormats(record.Date);
      } catch (e: any) {
        console.error('Error parsing date:', record.Date, e);
        dateObj = new Date();
      }
    } else {
      dateObj = new Date();
    }

    const duration = parseNumericString(record['Time (hrs)']);
    const startTime = record['Time (CST)'] || '';
    const endTime = calculateEndTime(startTime, duration);

    // Cast payment statuses using the validators
    const studentPayment = record['Student Payment'] || 'pending';
    const tutorPayment = record['Tutor Payment'] || 'pending';

    return {
      id: record.id,
      title: record['Class Number'] || '',
      tutorName: record['Tutor Name'] || '',
      studentName: record['Student Name'] || '',
      date: dateObj,
      startTime,
      endTime,
      duration,
      subject: record.Subject || '',
      content: record.Content || '',
      homework: record.HW || '',
      status: 'completed' as ClassStatus,
      attendance: 'present' as AttendanceStatus,
      zoomLink: '',
      notes: record['Additional Info'] || '',
      classCost: parseNumericString(record['Class Cost']),
      tutorCost: parseNumericString(record['Tutor Cost']),
      studentPayment: isValidPaymentStatus(studentPayment)
        ? studentPayment
        : 'pending',
      tutorPayment: isValidPaymentStatus(tutorPayment)
        ? tutorPayment
        : 'pending',
      recurring: false,
      materials: [],
    };
  } catch (error: any) {
    console.error('Error transforming record:', error, record);
    return {
      id: record.id || 'unknown',
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
};
