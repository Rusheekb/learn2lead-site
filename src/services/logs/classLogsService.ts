import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { format, parse } from "date-fns";
import { Database } from '../../integrations/supabase/types';
import { parseNumericString } from "@/utils/numberUtils";
import { transformClassLog, transformCodeLog } from "./transformers";
import { DbClassLog, TransformedClassLog } from "./types";

// Fetch all class logs
export const fetchClassLogs = async (): Promise<TransformedClassLog[]> => {
  console.log('Fetching class logs from Supabase...');
  try {
    // Fetch both regular class logs and code logs
    const [classLogsResult, codeLogsResult] = await Promise.all([
      supabase.from('class_logs').select('*'),
      supabase.from('code_logs').select('*')
    ]);

    if (classLogsResult.error) {
      console.error('Error fetching class logs:', classLogsResult.error);
    }

    if (codeLogsResult.error) {
      console.error('Error fetching code logs:', codeLogsResult.error);
    }

    const classLogs = classLogsResult.data || [];
    const codeLogs = codeLogsResult.data || [];

    // Transform logs
    const transformedClassLogs = classLogs.map(transformClassLog);
    const transformedCodeLogs = codeLogs.map(transformCodeLog);

    // Combine and sort all logs by date
    return [...transformedClassLogs, ...transformedCodeLogs].sort((a, b) => 
      b.date.getTime() - a.date.getTime()
    );
  } catch (error) {
    console.error('Unexpected error in fetchClassLogs:', error);
    return [];
  }
};

// Create a new class log
export const createClassLog = async (classEvent: ClassEvent): Promise<ClassEvent | null> => {
  const record = {
    class_number: classEvent.classNumber,
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
  
  return transformClassLog(data as DbClassLog);
}; 