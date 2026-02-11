
import { supabase, handleResult } from './supabaseClient';
import { ClassEvent, DbClassLog } from '@/types/tutorTypes';
import { transformDbRecordToClassEvent } from './utils/classEventMapper';
import { format } from 'date-fns';
import { generateClassId } from '@/utils/classIdGenerator';
import { parseDateToLocal, formatDateForDatabase } from '@/utils/safeDateUtils';

export async function fetchClassLogs(): Promise<ClassEvent[]> {
  const result = await supabase.from('class_logs').select('*');

  // Handle array response correctly
  if (result.error) {
    console.error(result.error);
    throw result.error;
  }
  
  // We need to transform the database records to ClassEvent type
  // Using the utility function from classEventMapper
  return result.data ? result.data.map(record => transformDbRecordToClassEvent(record)) : [];
}

export async function createClassLog(
  classLog: Record<string, any>
): Promise<ClassEvent> {
  // First, format the date correctly using local time parser
  const dateValue = classLog.Date || classLog.date;
  const parsedDate = dateValue ? parseDateToLocal(dateValue) : new Date();
  const formattedDate = formatDateForDatabase(parsedDate);
    
  // Then calculate day based on the parsed local date
  const dayValue = classLog.day || classLog.Day || 
    format(parsedDate, 'EEEE');
  
  // Generate or use existing Class Number
  let classNumber = classLog['Class Number'];
  
  if (!classNumber) {
    // Fetch existing class numbers for ID generation
    const { data: existingLogs } = await supabase
      .from('class_logs')
      .select('Class Number')
      .eq('Date', formattedDate);
    
    const existingIds = existingLogs?.map(log => (log as any)['Class Number'] as string).filter(Boolean) || [];
    
    // Generate unique class ID
    const studentName = classLog.studentName || classLog['Student Name'] || 'Unknown';
    const tutorName = classLog.tutorName || classLog['Tutor Name'] || 'Unknown';
    
    classNumber = generateClassId({
      studentName,
      tutorName,
      date: formattedDate,
      existingIds,
    });
  }
    
  // Auto-fill costs from student/tutor default rates if not provided
  let classCost = classLog.classCost?.toString() || classLog['Class Cost'] || null;
  let tutorCost = classLog.tutorCost?.toString() || classLog['Tutor Cost'] || null;

  const studentName = classLog.studentName || classLog['Student Name'] || null;
  const tutorName = classLog.tutorName || classLog['Tutor Name'] || null;

  if (!classCost && studentName) {
    const { data: studentData } = await supabase
      .from('students')
      .select('class_rate')
      .eq('name', studentName)
      .maybeSingle();
    if (studentData?.class_rate != null) {
      classCost = studentData.class_rate.toString();
    }
  }

  if (!tutorCost && tutorName) {
    const { data: tutorData } = await supabase
      .from('tutors')
      .select('hourly_rate')
      .eq('name', tutorName)
      .maybeSingle();
    if (tutorData?.hourly_rate != null) {
      tutorCost = tutorData.hourly_rate.toString();
    }
  }

  // Create a properly formatted object that matches the database schema
  // Payment dates default to NULL (unpaid) - date-based payment tracking
  const dbRecord = {
    'Date': formattedDate,
    'Class Number': classNumber,
    'Tutor Name': classLog.tutorName || classLog['Tutor Name'] || null,
    'Student Name': classLog.studentName || classLog['Student Name'] || null,
    'Day': dayValue,
    'Time (CST)': classLog.startTime || classLog['Time (CST)'] || null,
    'Time (hrs)': classLog.duration?.toString() || classLog['Time (hrs)'] || null,
    'Subject': classLog.subject || classLog.Subject || null,
    'Content': classLog.content || classLog.Content || null,
    'HW': classLog.homework || classLog.HW || null,
    'Class Cost': classCost,
    'Tutor Cost': tutorCost,
    'student_payment_date': classLog.studentPaymentDate || classLog['student_payment_date'] || null,
    'tutor_payment_date': classLog.tutorPaymentDate || classLog['tutor_payment_date'] || null,
    'Additional Info': classLog.notes || classLog['Additional Info'] || null,
    'Class ID': classLog.classId || classLog['Class ID'] || null
  };
  
  const result = await supabase
    .from('class_logs')
    .insert(dbRecord)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating class log:', result.error);
    throw result.error;
  }
  
  // Auto-apply prepaid balance if student has one
  const createdLog = result.data;
  const logStudentName = createdLog['Student Name'];
  if (logStudentName) {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('prepaid_balance, class_rate')
        .eq('name', logStudentName)
        .maybeSingle();

      if (studentData && studentData.class_rate && 
          (studentData.prepaid_balance ?? 0) >= studentData.class_rate) {
        const newBalance = (studentData.prepaid_balance ?? 0) - studentData.class_rate;
        
        // Mark this class as paid
        await supabase
          .from('class_logs')
          .update({ student_payment_date: format(new Date(), 'yyyy-MM-dd') })
          .eq('id', createdLog.id);

        // Reduce prepaid balance
        await supabase
          .from('students')
          .update({ prepaid_balance: Math.round(newBalance * 100) / 100 })
          .eq('name', logStudentName);
          
        console.log(`Auto-applied prepaid balance for ${logStudentName}: $${studentData.class_rate}`);
      }
    } catch (prepaidError) {
      // Don't fail class creation if prepaid logic fails
      console.error('Error auto-applying prepaid balance:', prepaidError);
    }
  }
  
  // Transform the DB record to a ClassEvent
  return transformDbRecordToClassEvent(createdLog);
}

export async function updateClassLog(
  id: string,
  updates: Record<string, any>
): Promise<ClassEvent> {
  // Make sure we're using the correct database field names
  // The updates should already be in the correct format (with capital field names)
  // but we can add validation here if needed
  
  if (updates.date) {
    updates['Date'] = typeof updates.date === 'string' 
      ? updates.date 
      : format(updates.date, 'yyyy-MM-dd');
    delete updates.date;
  }
  
  const result = await supabase
    .from('class_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  // Transform to our application type
  return transformDbRecordToClassEvent(handleResult(result));
}

export async function deleteClassLog(id: string): Promise<ClassEvent> {
  const result = await supabase
    .from('class_logs')
    .delete()
    .eq('id', id)
    .select()
    .single();
    
  // Transform to our application type
  return transformDbRecordToClassEvent(handleResult(result));
}
