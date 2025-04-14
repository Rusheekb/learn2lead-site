import { ClassEvent } from "@/types/tutorTypes";
import { StudentMessage, StudentUpload } from "@/components/shared/StudentContent";

// Types for database records
export interface ClassLogRecord {
  id: string;
  "Class Number": string;
  "Tutor Name": string;
  "Student Name": string;
  "Date": string;
  "Day": string;
  "Time (CST)": string;
  "Time (hrs)": string;
  "Subject": string;
  "Content": string;
  "HW": string;
  "Class ID": string;
  "Class Cost": string;
  "Tutor Cost": string;
  "Student Payment": string;
  "Tutor Payment": string;
  "Additional Info": string;
}

// Convert database record to ClassEvent
export const mapToClassEvent = (record: ClassLogRecord): ClassEvent => {
  // Parse and validate date
  let formattedDate = record.Date;
  try {
    // Try to parse the date and format it to YYYY-MM-DD
    const dateObj = new Date(record.Date);
    if (!isNaN(dateObj.getTime())) {
      formattedDate = dateObj.toISOString().split('T')[0];
    }
  } catch (e) {
    console.warn('Invalid date format:', record.Date);
  }

  // Parse and validate time
  let startTime = '00:00';
  let endTime = '01:00';
  try {
    if (record['Time (CST)']) {
      startTime = record['Time (CST)'].trim();
      // Ensure time is in HH:mm format
      if (!startTime.includes(':')) {
        startTime = startTime + ':00';
      }
      const [hours, minutes] = startTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Invalid time format');
      }
      startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Calculate end time
      const durationHours = parseFloat(record['Time (hrs)']) || 1;
      const totalMinutes = hours * 60 + minutes + durationHours * 60;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = Math.floor(totalMinutes % 60);
      endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    }
  } catch (e) {
    console.warn('Invalid time format:', record['Time (CST)']);
  }

  return {
    id: record.id || String(Math.random()),
    title: `Class ${record['Class Number'] || 'N/A'} - ${record.Subject || 'N/A'}: ${record.Content || 'N/A'}`,
    subject: record.Subject || 'N/A',
    tutorName: record['Tutor Name'] || 'N/A',
    studentName: record['Student Name'] || 'N/A',
    date: formattedDate,
    startTime,
    endTime,
    status: 'completed',
    attendance: 'present',
    notes: `Content: ${record.Content || 'N/A'}\nHomework: ${record.HW || 'None'}\nAdditional Info: ${record['Additional Info'] || 'None'}`,
    paymentStatus: record['Student Payment']?.toLowerCase() === 'paid' ? 'completed' : 'pending',
    tutorPaymentStatus: record['Tutor Payment']?.toLowerCase() === 'paid' ? 'completed' : 'pending',
    classCost: parseFloat(record['Class Cost']) || 0,
    tutorCost: parseFloat(record['Tutor Cost']) || 0
  };
};

// Convert ClassEvent to database record
export const mapToClassLogRecord = (event: ClassEvent): Omit<ClassLogRecord, 'id'> => {
  return {
    "Class Number": event.title.split(' - ')[0].replace('Class ', ''),
    "Tutor Name": event.tutorName,
    "Student Name": event.studentName,
    "Date": event.date,
    "Day": new Date(event.date).toLocaleDateString('en-US', { weekday: 'long' }),
    "Time (CST)": event.startTime,
    "Time (hrs)": ((new Date(`2000/01/01 ${event.endTime}`).getTime() - 
                    new Date(`2000/01/01 ${event.startTime}`).getTime()) / 
                    (1000 * 60 * 60)).toString(),
    "Subject": event.subject,
    "Content": event.notes?.split('\nHomework:')[0].replace('Content: ', '') || '',
    "HW": event.notes?.split('\nHomework:')[1]?.split('\nAdditional Info:')[0].trim() || '',
    "Class ID": '',
    "Class Cost": event.classCost.toString(),
    "Tutor Cost": event.tutorCost.toString(),
    "Student Payment": event.paymentStatus === 'completed' ? 'paid' : 'unpaid',
    "Tutor Payment": event.tutorPaymentStatus === 'completed' ? 'paid' : 'unpaid',
    "Additional Info": event.notes?.split('\nAdditional Info:')[1]?.trim() || ''
  };
};

// Interface for message records from DB
export interface ClassMessageRecord {
  id: string;
  class_id: string;
  student_name: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

// Map DB message record to frontend model
export const mapToStudentMessage = (record: ClassMessageRecord): StudentMessage => {
  return {
    id: record.id,
    classId: record.class_id,
    studentName: record.student_name,
    message: record.message,
    timestamp: record.timestamp,
    isRead: record.is_read
  };
};

// Interface for upload records from DB
export interface ClassUploadRecord {
  id: string;
  class_id: string;
  student_name: string;
  file_name: string;
  file_size: string;
  upload_date: string;
  note: string | null;
  file_path: string;
}

// Map DB upload record to frontend model
export const mapToStudentUpload = (record: ClassUploadRecord): StudentUpload => {
  return {
    id: record.id,
    classId: record.class_id,
    studentName: record.student_name,
    fileName: record.file_name,
    fileSize: record.file_size,
    uploadDate: record.upload_date,
    note: record.note
  };
};
