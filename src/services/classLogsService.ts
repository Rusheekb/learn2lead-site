import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { 
  ClassLogRecord, 
  mapToClassEvent, 
  mapToClassLogRecord 
} from "./utils/classMappers";
import { addDays, format } from "date-fns";

// Fetch all class logs
export const fetchClassLogs = async (): Promise<ClassEvent[]> => {
  console.log('Fetching class logs...');
  const { data, error } = await supabase
    .from('class_logs')
    .select(`
      id,
      "Class Number",
      "Tutor Name",
      "Student Name",
      "Date",
      "Day",
      "Time (CST)",
      "Time (hrs)",
      "Subject",
      "Content",
      "HW",
      "Class ID",
      "Class Cost",
      "Tutor Cost",
      "Student Payment",
      "Tutor Payment",
      "Additional Info"
    `)
    .order('Date', { ascending: false });
  
  if (error) {
    console.error("Error fetching class logs:", error);
    return [];
  }

  console.log('Raw data from Supabase:', data);
  // Transform the data to match our expected format
  const transformedData = data?.map(record => {
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
        const timeStr = record['Time (CST)'].trim().toLowerCase();
        
        // First try to parse single time format (e.g., "4:00 pm", "17:30", "6")
        const singleTimeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(?:(am|pm|a|p|om))?$/i;
        const timeRangeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(?:(am|pm|a|p|om))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(?:(am|pm|a|p|om))?$/i;
        
        let timeComponents;
        
        if (timeStr.includes('-') || timeStr.includes('–')) {
          // Try to parse time range format
          timeComponents = timeStr.match(timeRangeRegex);
          if (timeComponents) {
            let [_, startHour, startMin = '00', startAmPm, endHour, endMin = '00', endAmPm] = timeComponents;
            
            // Convert to 24-hour format
            startHour = parseInt(startHour);
            endHour = parseInt(endHour);
            
            // Handle AM/PM for start time
            if (startAmPm) {
              startAmPm = startAmPm.charAt(0).toLowerCase();
              if (startAmPm === 'p' && startHour !== 12) startHour += 12;
              if (startAmPm === 'a' && startHour === 12) startHour = 0;
            } else if (startHour < 7) { // Assume PM for times before 7 if no AM/PM specified
              startHour += 12;
            }
            
            // Handle AM/PM for end time
            if (endAmPm) {
              endAmPm = endAmPm.charAt(0).toLowerCase();
              if (endAmPm === 'p' && endHour !== 12) endHour += 12;
              if (endAmPm === 'a' && endHour === 12) endHour = 0;
            } else {
              // If no end AM/PM, use same period as start time
              if (startHour >= 12 && endHour < 12) endHour += 12;
            }
            
            startTime = `${startHour.toString().padStart(2, '0')}:${startMin.padStart(2, '0')}`;
            endTime = `${endHour.toString().padStart(2, '0')}:${endMin.padStart(2, '0')}`;
          }
        } else {
          // Try to parse single time format
          timeComponents = timeStr.match(singleTimeRegex);
          if (timeComponents) {
            let [_, hour, minutes = '00', amPm] = timeComponents;
            let parsedHour = parseInt(hour);
            
            // Handle AM/PM
            if (amPm) {
              amPm = amPm.charAt(0).toLowerCase();
              if (amPm === 'p' && parsedHour !== 12) parsedHour += 12;
              if (amPm === 'a' && parsedHour === 12) parsedHour = 0;
            } else if (parsedHour < 7) { // Assume PM for times before 7 if no AM/PM specified
              parsedHour += 12;
            }
            
            startTime = `${parsedHour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
            // Set end time to 1 hour after start time
            const endHour = (parsedHour + 1) % 24;
            endTime = `${endHour.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
          }
        }
        
        if (!timeComponents) {
          console.warn('Could not parse time format:', timeStr);
        }
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
      date: new Date(formattedDate),
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
  }) || [];

  console.log('Transformed class events:', transformedData);
  return transformedData;
};

// Create a new class log
export const createClassLog = async (classEvent: ClassEvent): Promise<ClassEvent | null> => {
  const record = mapToClassLogRecord(classEvent);
  
  const { data, error } = await supabase
    .from('class_logs')
    .insert(record)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating class log:", error);
    return null;
  }
  
  return mapToClassEvent(data as ClassLogRecord);
};

// Update an existing class log
export const updateClassLog = async (id: string, classEvent: Partial<ClassEvent>): Promise<ClassEvent | null> => {
  // Convert from ClassEvent partial to ClassLogRecord partial
  const updateData: any = {};
  
  if (classEvent.title) updateData.title = classEvent.title;
  if (classEvent.subject) updateData.subject = classEvent.subject;
  if (classEvent.studentName) updateData.student_name = classEvent.studentName;
  if (classEvent.date) updateData.date = classEvent.date;
  if (classEvent.startTime) updateData.start_time = classEvent.startTime + ":00";
  if (classEvent.endTime) updateData.end_time = classEvent.endTime + ":00";
  if (classEvent.zoomLink !== undefined) updateData.zoom_link = classEvent.zoomLink;
  if (classEvent.notes !== undefined) updateData.notes = classEvent.notes;
  
  updateData.updated_at = new Date().toISOString();
  
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
  
  return mapToClassEvent(data as ClassLogRecord);
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
