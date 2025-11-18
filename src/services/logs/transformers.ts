
import { format, parse } from 'date-fns';
import { parseNumericString } from '@/utils/numberUtils';
import { DbClassLog, DbCodeLog, TransformedClassLog } from './types';
import { Database } from '@/integrations/supabase/types';
import { calculateEndTime } from '@/services/utils/dateTimeTransformers';

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];

export const transformClassLog = (record: DbClassLog): TransformedClassLog => {
  try {
    let dateObj: Date;
    if (record['Date']) {
      try {
        dateObj = parse(record['Date'], 'yyyy-MM-dd', new Date());
      } catch (e) {
        console.error('Error parsing date:', record['Date']);
        dateObj = new Date();
      }
    } else {
      dateObj = new Date();
    }

    // Calculate duration and endTime
    const startTime = record['Time (CST)'] ?? '';
    const duration = parseNumericString(record['Time (hrs)'] ?? '0');
    const endTime = calculateEndTime(startTime, duration) || startTime; // Default to startTime if calculation fails

    return {
      id: record.id,
      classNumber: record['Class Number'] ?? '',
      tutorName: record['Tutor Name'] ?? '',
      studentName: record['Student Name'] ?? '',
      date: dateObj,
      day: record['Day'] || format(dateObj, 'EEEE'),
      startTime: startTime,
      duration: duration,
      subject: record['Subject'] ?? '',
      content: record['Content'] || '',
      homework: record['HW'] || '',
      classId: record['Class ID'] ?? '',
      classCost: typeof record['Class Cost'] === 'number' ? record['Class Cost'] : (parseFloat(String(record['Class Cost'] ?? '0')) || 0),
      tutorCost: typeof record['Tutor Cost'] === 'number' ? record['Tutor Cost'] : (parseFloat(String(record['Tutor Cost'] ?? '0')) || 0),
      studentPaymentDate: record.student_payment_date ? new Date(record.student_payment_date) : null,
      tutorPaymentDate: record.tutor_payment_date ? new Date(record.tutor_payment_date) : null,
      studentPayment: record.student_payment_date ? 'paid' : 'unpaid',
      tutorPayment: record.tutor_payment_date ? 'paid' : 'unpaid',
      additionalInfo: record['Additional Info'],
      isCodeLog: false,
      // Add these to match ClassEvent interface
      title: record['Class Number'] ?? '',
      endTime: endTime, // Now always populated
      zoomLink: null,
      notes: record['Additional Info'],
    };
  } catch (error) {
    console.error(`Error transforming class log record:`, error, record);
    return createErrorLog(record.id, false);
  }
};

export const transformCodeLog = (record: DbCodeLog): TransformedClassLog => {
  try {
    let dateObj: Date;
    if (record.date) {
      try {
        dateObj = parse(record.date, 'yyyy-MM-dd', new Date());
      } catch (e) {
        console.error('Error parsing date:', record.date);
        dateObj = new Date();
      }
    } else {
      dateObj = new Date();
    }

    // Calculate endTime from startTime and duration
    const startTime = record.time_cst || 'N/A';
    const duration = parseNumericString(record.time_hrs ?? '0');
    const endTime = calculateEndTime(startTime, duration) || startTime; // Default to startTime if calculation fails

    return {
      id: record.id,
      classNumber: record.class_number || 'Code Session',
      tutorName: record.tutor_name ?? '',
      studentName: record.student_name ?? '',
      date: dateObj,
      day: record.day || format(dateObj, 'EEEE'),
      startTime: startTime,
      duration: duration,
      subject: 'Coding',
      content: record.content || '',
      homework: record.hw || '',
      classId: record.id,
      classCost: typeof record.class_cost === 'number' ? record.class_cost : (parseFloat(record.class_cost ?? '0') || 0),
      tutorCost: typeof record.tutor_cost === 'number' ? record.tutor_cost : (parseFloat(record.tutor_cost ?? '0') || 0),
      studentPaymentDate: record.student_payment_date ? new Date(record.student_payment_date) : null,
      tutorPaymentDate: record.tutor_payment_date ? new Date(record.tutor_payment_date) : null,
      studentPayment: record.student_payment_date ? 'paid' : 'unpaid',
      tutorPayment: record.tutor_payment_date ? 'paid' : 'unpaid',
      additionalInfo: record.additional_info ?? null,
      isCodeLog: true,
      // Add these to match ClassEvent interface
      title: record.class_number || 'Code Session',
      endTime: endTime, // Now always populated
      zoomLink: null,
      notes: record.additional_info,
    };
  } catch (error) {
    console.error(`Error transforming code log record:`, error, record);
    return createErrorLog(record.id, true);
  }
};

const createErrorLog = (
  id: string = 'unknown',
  isCodeLog: boolean
): TransformedClassLog => ({
  id: id,
  classNumber: 'Error',
  tutorName: 'Error Loading',
  studentName: 'Error Loading',
  date: new Date(),
  day: 'Unknown',
  startTime: 'Error',
  duration: 0,
  subject: isCodeLog ? 'Coding' : 'Error Loading',
  content: 'Error loading content',
  homework: '',
  classId: id,
  classCost: 0,
  tutorCost: 0,
  studentPaymentDate: null,
  tutorPaymentDate: null,
  studentPayment: 'Error',
  tutorPayment: 'Error',
  additionalInfo: 'Error loading class data',
  isCodeLog,
  title: 'Error',
  endTime: 'Error',
  zoomLink: null,
  notes: 'Error loading class data',
});
