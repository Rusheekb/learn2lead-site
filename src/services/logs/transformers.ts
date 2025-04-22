
import { format, parse } from "date-fns";
import { parseNumericString } from "@/utils/numberUtils";
import { DbClassLog, DbCodeLog, TransformedClassLog } from "./types";
import { Database } from "@/integrations/supabase/types";

type ClassLogs = Database['public']['Tables']['class_logs']['Row'];

export const transformClassLog = (record: DbClassLog): TransformedClassLog => {
  try {
    let dateObj: Date;
    if (record["Date"]) {
      try {
        dateObj = parse(record["Date"], 'yyyy-MM-dd', new Date());
      } catch (e) {
        console.error('Error parsing date:', record["Date"]);
        dateObj = new Date();
      }
    } else {
      dateObj = new Date();
    }

    return {
      id: record.id,
      classNumber: record["Class Number"] ?? '',
      tutorName: record["Tutor Name"] ?? '',
      studentName: record["Student Name"] ?? '',
      date: dateObj,
      day: record["Day"] || format(dateObj, 'EEEE'),
      startTime: record["Time (CST)"] ?? '',
      duration: parseNumericString(record["Time (hrs)"] ?? '0'),
      subject: record["Subject"] ?? '',
      content: record["Content"] || '',
      homework: record["HW"] || '',
      classId: record["Class ID"] ?? '',
      classCost: parseNumericString(record["Class Cost"] ?? '0'),
      tutorCost: parseNumericString(record["Tutor Cost"] ?? '0'),
      studentPayment: record["Student Payment"] || 'Pending',
      tutorPayment: record["Tutor Payment"] || 'Pending',
      additionalInfo: record["Additional Info"],
      isCodeLog: false,
      // Add these to match ClassEvent interface
      title: record["Class Number"] ?? '',
      endTime: '',
      zoomLink: null,
      notes: record["Additional Info"]
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
      isCodeLog: true,
      // Add these to match ClassEvent interface
      title: record.class_number || 'Code Session',
      endTime: '',
      zoomLink: null,
      notes: record.additional_info
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
  isCodeLog,
  title: 'Error',
  endTime: '',
  zoomLink: null,
  notes: 'Error loading class data'
});
