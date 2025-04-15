import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { addDays, format, parse } from "date-fns";
import { Database } from '../integrations/supabase/types';

type DbClassLog = Database['public']['Tables']['class_logs']['Row'];
type InsertDbClassLog = Database['public']['Tables']['class_logs']['Insert'];
type UpdateDbClassLog = Database['public']['Tables']['class_logs']['Update'];

export interface TransformedClassLog {
  id: string;
  classNumber: string;
  tutorName: string;
  studentName: string;
  date: Date;
  day: string;
  startTime: string;
  duration: number;
  subject: string;
  content: string;
  homework: string;
  classId: string;
  classCost: number;
  tutorCost: number;
  studentPayment: string;
  tutorPayment: string;
  additionalInfo: string | null;
}

// Helper function to parse numeric string to number
const parseNumericString = (value: string | null): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Fetch all class logs
export const fetchClassLogs = async (): Promise<TransformedClassLog[]> => {
  console.log('Fetching class logs from Supabase...');
  try {
    const { data: classLogs, error } = await supabase
      .from('class_logs')
      .select('*');

    if (error) {
      console.error('Error fetching class logs:', error);
      return [];
    }

    if (!classLogs || classLogs.length === 0) {
      console.warn('No class logs found');
      return [];
    }

    console.log('Raw class logs:', classLogs);

    return classLogs.map((record: DbClassLog): TransformedClassLog => {
      try {
        // Parse the date string (assuming it's in YYYY-MM-DD format)
        let dateObj: Date;
        if (record.date) {
          try {
            dateObj = parse(record.date, 'yyyy-MM-dd', new Date());
          } catch (e) {
            console.error('Error parsing date:', record.date);
            dateObj = new Date(); // Fallback to current date
          }
        } else {
          dateObj = new Date(); // Fallback to current date if date is undefined
        }

        // Parse duration from time string
        const duration = parseNumericString(record.time_hrs);

        return {
          id: record.id,
          classNumber: record.class_number,
          tutorName: record.tutor_name,
          studentName: record.student_name,
          date: dateObj,
          day: record.day || format(dateObj, 'EEEE'),
          startTime: record.time_cst,
          duration: duration,
          subject: record.subject,
          content: record.content || '',
          homework: record.hw || '',
          classId: record.class_id,
          classCost: parseNumericString(record.class_cost),
          tutorCost: parseNumericString(record.tutor_cost),
          studentPayment: record.student_payment || 'Pending',
          tutorPayment: record.tutor_payment || 'Pending',
          additionalInfo: record.additional_info
        };
      } catch (error) {
        console.error(`Error transforming class log record:`, error, record);
        return {
          id: record.id || 'unknown',
          classNumber: 'Error',
          tutorName: 'Error Loading',
          studentName: 'Error Loading',
          date: new Date(),
          day: 'Unknown',
          startTime: 'Error',
          duration: 0,
          subject: 'Error Loading',
          content: 'Error loading content',
          homework: '',
          classId: record.id || 'unknown',
          classCost: 0,
          tutorCost: 0,
          studentPayment: 'Error',
          tutorPayment: 'Error',
          additionalInfo: 'Error loading class data'
        };
      }
    });
  } catch (error) {
    console.error('Unexpected error in fetchClassLogs:', error);
    return [];
  }
};

// Create a new class log
export const createClassLog = async (classEvent: ClassEvent): Promise<ClassEvent | null> => {
  const record: InsertDbClassLog = {
    class_number: classEvent.title,
    tutor_name: classEvent.tutorName,
    student_name: classEvent.studentName,
    date: format(classEvent.date, 'yyyy-MM-dd'),
    day: format(classEvent.date, 'EEEE'),
    time_cst: classEvent.startTime,
    time_hrs: classEvent.duration.toString(),
    subject: classEvent.subject,
    content: classEvent.content || null,
    hw: classEvent.homework || null,
    class_id: classEvent.id,
    class_cost: classEvent.classCost?.toString() || null,
    tutor_cost: classEvent.tutorCost?.toString() || null,
    student_payment: 'Pending',
    tutor_payment: 'Pending',
    additional_info: classEvent.notes || null
  };
  
  const { data, error } = await supabase
    .from('class_logs')
    .insert(record)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating class log:", error);
    return null;
  }
  
  const dbLog = data as DbClassLog;
  return dbLog ? {
    id: dbLog.class_id,
    title: dbLog.class_number,
    tutorName: dbLog.tutor_name,
    studentName: dbLog.student_name,
    date: parse(dbLog.date, 'yyyy-MM-dd', new Date()),
    startTime: dbLog.time_cst,
    duration: parseNumericString(dbLog.time_hrs),
    subject: dbLog.subject,
    content: dbLog.content || undefined,
    homework: dbLog.hw || undefined,
    classCost: parseNumericString(dbLog.class_cost),
    tutorCost: parseNumericString(dbLog.tutor_cost),
    notes: dbLog.additional_info || undefined
  } : null;
};

// Update an existing class log
export const updateClassLog = async (id: string, classEvent: Partial<ClassEvent>): Promise<ClassEvent | null> => {
  const updateData: UpdateDbClassLog = {};
  
  if (classEvent.title) updateData.class_number = classEvent.title;
  if (classEvent.tutorName) updateData.tutor_name = classEvent.tutorName;
  if (classEvent.studentName) updateData.student_name = classEvent.studentName;
  if (classEvent.date) {
    updateData.date = format(classEvent.date, 'yyyy-MM-dd');
    updateData.day = format(classEvent.date, 'EEEE');
  }
  if (classEvent.startTime) updateData.time_cst = classEvent.startTime;
  if (classEvent.duration) updateData.time_hrs = classEvent.duration.toString();
  if (classEvent.subject) updateData.subject = classEvent.subject;
  if (classEvent.content !== undefined) updateData.content = classEvent.content || null;
  if (classEvent.homework !== undefined) updateData.hw = classEvent.homework || null;
  if (classEvent.classCost !== undefined) updateData.class_cost = classEvent.classCost?.toString() || null;
  if (classEvent.tutorCost !== undefined) updateData.tutor_cost = classEvent.tutorCost?.toString() || null;
  if (classEvent.notes !== undefined) updateData.additional_info = classEvent.notes || null;
  
  const { data, error } = await supabase
    .from('class_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating class log:", error);
    return null;
  }
  
  const dbLog = data as DbClassLog;
  return dbLog ? {
    id: dbLog.class_id,
    title: dbLog.class_number,
    tutorName: dbLog.tutor_name,
    studentName: dbLog.student_name,
    date: parse(dbLog.date, 'yyyy-MM-dd', new Date()),
    startTime: dbLog.time_cst,
    duration: parseNumericString(dbLog.time_hrs),
    subject: dbLog.subject,
    content: dbLog.content || undefined,
    homework: dbLog.hw || undefined,
    classCost: parseNumericString(dbLog.class_cost),
    tutorCost: parseNumericString(dbLog.tutor_cost),
    notes: dbLog.additional_info || undefined
  } : null;
};

// Delete a class log
export const deleteClassLog = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error("Error deleting class log:", error);
    return false;
  }
  
  return true;
};
