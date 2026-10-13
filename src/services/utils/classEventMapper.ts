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
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { logger } from '@/lib/logger';
import {
  classTimesForViewer,
  instantToZonedParts,
  getViewerTimezone,
} from '@/lib/time';

const log = logger.create('classEventMapper');

interface DbRecord {
  id: string;
  'Class Number'?: string | null;
  Title?: string | null;
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
  student_user_id?: string | null;
  student_payment_date?: string | Date | null;
  tutor_payment_date?: string | Date | null;
  tutor_is_paid?: boolean | null;
  'Additional Info'?: string | null;
  disputed?: boolean | null;
  dispute_reason?: string | null;
  'Class ID'?: string | null;
  start_at?: string | null;
}

export const transformDbRecordToClassEvent = (record: unknown): ClassEvent => {
  if (!record || typeof record !== 'object' || !('id' in record)) {
    log.error('Invalid record format', undefined, { record });
    return createErrorClassEvent('unknown');
  }

  const dbRecord = record as DbRecord;
  try {
    const duration = parseNumericString(dbRecord['Time (hrs)']);

    // Shown in the viewer's time zone. start_at is the exact start; older
    // rows without it fall back to Date + "Time (CST)" as Central time.
    const rawStartTime = dbRecord['Time (CST)'] || '';
    const times = classTimesForViewer({
      start_at: dbRecord.start_at,
      date: dbRecord.Date,
      start_time: rawStartTime ? parseStartTime(rawStartTime) : null,
    });
    const startTime = times.startTime || parseStartTime(rawStartTime);
    const endAt =
      times.startAt && duration
        ? new Date(new Date(times.startAt).getTime() + duration * 3600_000)
        : null;
    const endTime = endAt
      ? instantToZonedParts(endAt, getViewerTimezone()).time
      : calculateEndTime(startTime, duration);

    let dateObj: Date;
    const dateSource = times.date || dbRecord.Date;
    if (dateSource) {
      try {
        dateObj = parseDateWithFormats(dateSource);
      } catch (e) {
        log.error('Error parsing date', e, { date: dateSource });
        dateObj = new Date();
      }
    } else {
      dateObj = new Date();
    }

    const studentPaymentDate = dbRecord.student_payment_date
      ? typeof dbRecord.student_payment_date === 'string'
        ? parseDateToLocal(dbRecord.student_payment_date)
        : dbRecord.student_payment_date
      : null;

    const tutorPaymentDate = dbRecord.tutor_payment_date
      ? typeof dbRecord.tutor_payment_date === 'string'
        ? parseDateToLocal(dbRecord.tutor_payment_date)
        : dbRecord.tutor_payment_date
      : null;

    const tutorIsPaid = !!dbRecord.tutor_is_paid;
    const studentPayment = studentPaymentDate ? 'paid' : 'unpaid';
    const tutorPayment = tutorIsPaid ? 'paid' : 'unpaid';

    const classCost = dbRecord['Class Cost'] ?? 0;
    const tutorCost = dbRecord['Tutor Cost'] ?? 0;

    return {
      id: dbRecord.id,
      classNumber: dbRecord['Class Number'] || '',
      title: dbRecord['Title'] || dbRecord.Subject || '',
      tutorName: dbRecord['Tutor Name'] || '',
      studentName: dbRecord['Student Name'] || '',
      date: dateObj,
      startTime,
      endTime,
      startAt: times.startAt,
      endAt: endAt ? endAt.toISOString() : null,
      tzAbbr: times.tzAbbr,
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
      studentId: dbRecord.student_user_id || undefined,
      studentPaymentDate,
      tutorPaymentDate,
      tutorIsPaid,
      studentPayment: studentPayment as PaymentStatus,
      tutorPayment: tutorPayment as PaymentStatus,
      recurring: false,
      materials: [],
      disputed: !!dbRecord.disputed,
      disputeReason: dbRecord.dispute_reason || null,
      scheduledClassId: dbRecord['Class ID'] || undefined,
    };
  } catch (error) {
    log.error('Error transforming record', error, { recordId: dbRecord.id });
    return createErrorClassEvent(dbRecord.id);
  }
};

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
    tutorIsPaid: false,
    studentPayment: 'pending' as PaymentStatus,
    tutorPayment: 'pending' as PaymentStatus,
    recurring: false,
    materials: [],
  };
}
