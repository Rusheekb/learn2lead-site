
import { ClassEvent } from "@/types/tutorTypes";
import { parseNumericString, calculateEndTime, parseDateWithFormats } from "./dateTimeTransformers";

/**
 * Transforms a database record to a ClassEvent object
 */
export const transformDbRecordToClassEvent = (record: any): ClassEvent => {
  try {
    // Parse date
    let dateObj: Date;
    
    if (record.Date) {
      try {
        dateObj = parseDateWithFormats(record.Date);
      } catch (e) {
        console.error('Error parsing date:', record.Date, e);
        dateObj = new Date(); // Fallback to current date
      }
    } else {
      dateObj = new Date(); // Fallback to current date
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
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      subject: record.Subject || '',
      content: record.Content || '',
      homework: record.HW || '',
      status: 'completed', // Default status for existing logs
      attendance: 'present', // Default attendance for existing logs
      zoomLink: "",
      notes: record['Additional Info'] || '',
      classCost: parseNumericString(record['Class Cost']),
      tutorCost: parseNumericString(record['Tutor Cost']),
      studentPayment: record['Student Payment'] || 'Pending',
      tutorPayment: record['Tutor Payment'] || 'Pending',
      recurring: false,
      materials: []
    };
  } catch (error) {
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
      status: 'error',
      attendance: 'unknown',
      zoomLink: "",
      notes: 'Error loading class data',
      classCost: 0,
      tutorCost: 0,
      studentPayment: 'Error',
      tutorPayment: 'Error',
      recurring: false,
      materials: []
    };
  }
};
