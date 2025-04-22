
import { format, parse } from "date-fns";
import { parseNumericString } from "@/utils/numberUtils";
import { DbClassLog, TransformedClassLog } from "./types";
import { Database } from "@/integrations/supabase/types";

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];
type CodeLogs = Database['public']['Tables']['code_logs']['Row'];

export const transformClassLog = (record: DbClassLog): TransformedClassLog => {
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

    return {
      id: record.id,
      classNumber: record.class_number ?? '',
      tutorName: record.tutor_name ?? '',
      studentName: record.student_name ?? '',
      date: dateObj,
      day: record.day || format(dateObj, 'EEEE'),
      startTime: record.time_cst ?? '',
      duration: parseNumericString(record.time_hrs ?? '0'),
      subject: record.subject ?? '',
      content: record.content || '',
      homework: record.hw || '',
      classId: record.class_id ?? '',
      classCost: parseNumericString(record.class_cost ?? '0'),
      tutorCost: parseNumericString(record.tutor_cost ?? '0'),
      studentPayment: record.student_payment || 'Pending',
      tutorPayment: record.tutor_payment || 'Pending',
      additionalInfo: record.additional_info,
      isCodeLog: false
    };
  } catch (error) {
    console.error(`Error transforming class log record:`, error, record);
    return createErrorLog(record.id, false);
  }
};

export const transformCodeLog = (record: CodeLogs): TransformedClassLog => {
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

    return {
      id: record.id,
      classNumber: record.class_number || 'Code Session',
      tutorName: record.tutor_name ?? '',
      studentName: record.student_name ?? '',
      date: dateObj,
      day: record.day || format(dateObj, 'EEEE'),
      startTime: record.time_cst || 'N/A',
      duration: parseNumericString(record.time_hrs ?? '0'),
      subject: 'Coding',
      content: record.content || '',
      homework: record.hw || '',
      classId: record.id,
      classCost: parseNumericString(record.class_cost ?? '0'),
      tutorCost: parseNumericString(record.tutor_cost ?? '0'),
      studentPayment: record.student_payment || 'Pending',
      tutorPayment: record.tutor_payment || 'Pending',
      additionalInfo: record.additional_info ?? null,
      isCodeLog: true
    };
  } catch (error) {
    console.error(`Error transforming code log record:`, error, record);
    return createErrorLog(record.id, true);
  }
};

const createErrorLog = (id: string = 'unknown', isCodeLog: boolean): TransformedClassLog => ({
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
  studentPayment: 'Error',
  tutorPayment: 'Error',
  additionalInfo: 'Error loading class data',
  isCodeLog
}); 
