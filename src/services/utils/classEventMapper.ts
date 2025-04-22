import { ClassEvent } from '@/types/tutorTypes';
import {
  parseNumericString,
  calculateEndTime,
  parseDateWithFormats,
} from './dateTimeTransformers';

interface DbRecord {
  id: string;
  'Class Number'?: string;
  'Tutor Name'?: string;
  'Student Name'?: string;
  Date?: string;
  'Time (CST)'?: string;
  'Time (hrs)'?: string | number;
  Subject?: string;
  Content?: string;
  HW?: string;
  'Class Cost'?: string | number;
  'Tutor Cost'?: string | number;
  'Student Payment'?: string;
  'Tutor Payment'?: string;
  'Additional Info'?: string;
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
      status: 'completed' as const,
      attendance: 'present' as const,
      zoomLink: '',
      notes: record['Additional Info'] || '',
      classCost: parseNumericString(record['Class Cost']),
      tutorCost: parseNumericString(record['Tutor Cost']),
      studentPayment: record['Student Payment'] || 'Pending',
      tutorPayment: record['Tutor Payment'] || 'Pending',
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
      status: 'error' as const,
      attendance: 'unknown' as const,
      zoomLink: '',
      notes: 'Error loading class data',
      classCost: 0,
      tutorCost: 0,
      studentPayment: 'Error',
      tutorPayment: 'Error',
      recurring: false,
      materials: [],
    };
  }
};
