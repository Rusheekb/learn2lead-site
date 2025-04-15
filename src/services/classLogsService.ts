import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { addDays, format, parse } from "date-fns";
import { Database } from '../integrations/supabase/types';

type DbClassLog = Database['public']['Tables']['class_logs']['Row'];
type InsertDbClassLog = Database['public']['Tables']['class_logs']['Insert'];
type UpdateDbClassLog = Database['public']['Tables']['class_logs']['Update'];

// Helper function to parse numeric string to number
const parseNumericString = (value: string | null): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to calculate end time
const calculateEndTime = (startTime: string, durationHrs: number): string => {
  if (!startTime || !durationHrs) return '';
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHrs * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating end time:', error);
    return '';
  }
};

// Transform database record to ClassEvent
const transformDbRecordToClassEvent = (record: DbClassLog, isCodeLog: boolean = false): ClassEvent => {
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

    const duration = parseNumericString(record.time_hrs);
    const startTime = record.time_cst || '';
    const endTime = calculateEndTime(startTime, duration);

    return {
      id: record.id,
      title: record.class_number,
      tutorName: record.tutor_name,
      studentName: record.student_name,
      date: dateObj,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      subject: isCodeLog ? 'Coding' : record.subject,
      content: record.content || '',
      homework: record.hw || '',
      status: 'pending',
      attendance: 'pending',
      zoomLink: null,
      notes: record.additional_info,
      classCost: parseNumericString(record.class_cost),
      tutorCost: parseNumericString(record.tutor_cost),
      studentPayment: record.student_payment || 'Pending',
      tutorPayment: record.tutor_payment || 'Pending',
      isCodeLog
    };
  } catch (error) {
    console.error(`Error transforming ${isCodeLog ? 'code' : 'class'} log record:`, error, record);
    return {
      id: record.id || 'unknown',
      title: 'Error Loading',
      tutorName: 'Error Loading',
      studentName: 'Error Loading',
      date: new Date(),
      startTime: '',
      endTime: '',
      duration: 0,
      subject: isCodeLog ? 'Coding' : 'Error Loading',
      content: 'Error loading content',
      homework: '',
      status: 'error',
      attendance: 'unknown',
      zoomLink: null,
      notes: 'Error loading class data',
      classCost: 0,
      tutorCost: 0,
      studentPayment: 'Error',
      tutorPayment: 'Error',
      isCodeLog
    };
  }
};

// Fetch all class logs
export const fetchClassLogs = async (): Promise<ClassEvent[]> => {
  console.log('Fetching class logs from Supabase...');
  try {
    // Fetch both regular class logs and code logs
    const [classLogsResult, codeLogsResult] = await Promise.all([
      supabase.from('class_logs').select('*'),
      supabase.from('code_logs').select('*')
    ]);

    // Log the raw results including any errors
    console.log('Class logs result:', {
      data: classLogsResult.data,
      error: classLogsResult.error,
      status: classLogsResult.status,
      statusText: classLogsResult.statusText
    });
    
    console.log('Code logs result:', {
      data: codeLogsResult.data,
      error: codeLogsResult.error,
      status: codeLogsResult.status,
      statusText: codeLogsResult.statusText
    });

    if (classLogsResult.error) {
      console.error('Error fetching class logs:', classLogsResult.error);
      return [];
    }

    if (codeLogsResult.error) {
      console.error('Error fetching code logs:', codeLogsResult.error);
      return [];
    }

    const classLogs = classLogsResult.data || [];
    const codeLogs = codeLogsResult.data || [];

    // Log the raw data
    console.log('Raw class logs:', classLogs);
    console.log('Raw code logs:', codeLogs);

    // Transform and combine both types of logs
    const transformedClassLogs = classLogs.map(record => {
      console.log('Transforming class log:', record);
      return transformDbRecordToClassEvent(record, false);
    });
    
    const transformedCodeLogs = codeLogs.map(record => {
      console.log('Transforming code log:', record);
      return transformDbRecordToClassEvent(record, true);
    });

    // Log the transformed data
    console.log('Transformed class logs:', transformedClassLogs);
    console.log('Transformed code logs:', transformedCodeLogs);

    // Combine and sort all logs by date
    const allLogs = [...transformedClassLogs, ...transformedCodeLogs].sort((a, b) => 
      b.date.getTime() - a.date.getTime()
    );

    console.log('Final combined and sorted logs:', allLogs);
    return allLogs;
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
    content: classEvent.content,
    hw: classEvent.homework,
    class_id: classEvent.id,
    class_cost: classEvent.classCost?.toString(),
    tutor_cost: classEvent.tutorCost?.toString(),
    student_payment: classEvent.studentPayment,
    tutor_payment: classEvent.tutorPayment,
    additional_info: classEvent.notes
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

  return transformDbRecordToClassEvent(data, classEvent.isCodeLog);
};

// Update a class log
export const updateClassLog = async (id: string, classEvent: Partial<ClassEvent>): Promise<ClassEvent | null> => {
  const record: UpdateDbClassLog = {
    class_number: classEvent.title,
    tutor_name: classEvent.tutorName,
    student_name: classEvent.studentName,
    date: classEvent.date ? format(classEvent.date, 'yyyy-MM-dd') : undefined,
    day: classEvent.date ? format(classEvent.date, 'EEEE') : undefined,
    time_cst: classEvent.startTime,
    time_hrs: classEvent.duration?.toString(),
    subject: classEvent.subject,
    content: classEvent.content || null,
    hw: classEvent.homework || null,
    class_cost: classEvent.classCost?.toString(),
    tutor_cost: classEvent.tutorCost?.toString(),
    student_payment: classEvent.studentPayment,
    tutor_payment: classEvent.tutorPayment,
    additional_info: classEvent.notes
  };

  const { data, error } = await supabase
    .from('class_logs')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating class log:", error);
    return null;
  }

  return transformDbRecordToClassEvent(data, classEvent.isCodeLog);
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
