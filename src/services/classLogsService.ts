
import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { format, parse } from "date-fns";

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
const transformDbRecordToClassEvent = (record: any): ClassEvent => {
  try {
    // Parse the date string (assuming it's in YYYY-MM-DD format)
    let dateObj: Date;
    let dateString: string = '';
    
    if (record.Date) {
      try {
        dateObj = parse(record.Date, 'yyyy-MM-dd', new Date());
        dateString = format(dateObj, 'yyyy-MM-dd');
      } catch (e) {
        console.error('Error parsing date:', record.Date);
        dateObj = new Date(); // Fallback to current date
        dateString = format(dateObj, 'yyyy-MM-dd');
      }
    } else {
      dateObj = new Date(); // Fallback to current date
      dateString = format(dateObj, 'yyyy-MM-dd');
    }

    const duration = parseNumericString(record['Time (hrs)']);
    const startTime = record['Time (CST)'] || '';
    const endTime = calculateEndTime(startTime, duration);

    return {
      id: record.id,
      title: record['Class Number'] || '',
      tutorName: record['Tutor Name'] || '',
      studentName: record['Student Name'] || '',
      date: dateString,
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
      date: new Date().toISOString().split('T')[0],
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

// Fetch all class logs
export const fetchClassLogs = async (): Promise<ClassEvent[]> => {
  console.log('Fetching class logs from Supabase...');
  try {
    const { data, error } = await supabase.from('class_logs').select('*');
    
    if (error) {
      console.error('Error fetching class logs:', error);
      return [];
    }
    
    console.log('Raw class logs data:', data);
    
    if (!data || data.length === 0) {
      return [];
    }
    
    const transformedLogs = data.map(transformDbRecordToClassEvent);
    console.log('Transformed class logs:', transformedLogs);
    
    // Sort logs by date (most recent first)
    return transformedLogs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error in fetchClassLogs:', error);
    return [];
  }
};

// Create a new class log
export const createClassLog = async (classEvent: ClassEvent): Promise<ClassEvent | null> => {
  // Convert ClassEvent to the format expected by the database
  const record = {
    'Class Number': classEvent.title,
    'Tutor Name': classEvent.tutorName,
    'Student Name': classEvent.studentName,
    'Date': classEvent.date instanceof Date ? format(classEvent.date, 'yyyy-MM-dd') : classEvent.date,
    'Day': classEvent.date instanceof Date ? format(classEvent.date, 'EEEE') : format(new Date(classEvent.date), 'EEEE'),
    'Time (CST)': classEvent.startTime,
    'Time (hrs)': classEvent.duration.toString(),
    'Subject': classEvent.subject,
    'Content': classEvent.content,
    'HW': classEvent.homework,
    'Class Cost': classEvent.classCost?.toString(),
    'Tutor Cost': classEvent.tutorCost?.toString(),
    'Student Payment': classEvent.studentPayment,
    'Tutor Payment': classEvent.tutorPayment,
    'Additional Info': classEvent.notes
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

  return transformDbRecordToClassEvent(data);
};

// Update a class log
export const updateClassLog = async (id: string, classEvent: Partial<ClassEvent>): Promise<ClassEvent | null> => {
  // Convert ClassEvent to the format expected by the database
  const record: any = {};
  
  if (classEvent.title !== undefined) record['Class Number'] = classEvent.title;
  if (classEvent.tutorName !== undefined) record['Tutor Name'] = classEvent.tutorName;
  if (classEvent.studentName !== undefined) record['Student Name'] = classEvent.studentName;
  if (classEvent.date !== undefined) {
    record['Date'] = classEvent.date instanceof Date ? format(classEvent.date, 'yyyy-MM-dd') : classEvent.date;
    record['Day'] = classEvent.date instanceof Date ? format(classEvent.date, 'EEEE') : format(new Date(classEvent.date), 'EEEE');
  }
  if (classEvent.startTime !== undefined) record['Time (CST)'] = classEvent.startTime;
  if (classEvent.duration !== undefined) record['Time (hrs)'] = classEvent.duration.toString();
  if (classEvent.subject !== undefined) record['Subject'] = classEvent.subject;
  if (classEvent.content !== undefined) record['Content'] = classEvent.content;
  if (classEvent.homework !== undefined) record['HW'] = classEvent.homework;
  if (classEvent.classCost !== undefined) record['Class Cost'] = classEvent.classCost.toString();
  if (classEvent.tutorCost !== undefined) record['Tutor Cost'] = classEvent.tutorCost.toString();
  if (classEvent.studentPayment !== undefined) record['Student Payment'] = classEvent.studentPayment;
  if (classEvent.tutorPayment !== undefined) record['Tutor Payment'] = classEvent.tutorPayment;
  if (classEvent.notes !== undefined) record['Additional Info'] = classEvent.notes;

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

  return transformDbRecordToClassEvent(data);
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
