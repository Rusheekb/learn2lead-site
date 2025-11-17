import { format, parse } from 'date-fns';

export const formatTime = (time: string): string => {
  try {
    // Handle empty or invalid time
    if (!time || time === 'NaN' || time.includes('NaN')) return '';

    // Format 24-hour time (HH:MM) to 12-hour time (h:mm a)
    const [hours, minutes] = time.split(':').map(Number);
    
    // Validate parsed values
    if (isNaN(hours) || isNaN(minutes)) return '';
    
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);

    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return ''; // Return empty string for invalid times
  }
};

// Format time range intelligently (e.g., "6:00 - 7:00 PM" or "11:00 AM - 1:00 PM")
export const formatTimeRange = (startTime: string, endTime: string): string => {
  try {
    if (!startTime || !endTime || endTime.includes('NaN')) return 'Time not set';

    const start = formatTime(startTime);
    const end = formatTime(endTime);
    
    if (!start || !end) return 'Time not set';

    // Extract AM/PM from both times
    const startPeriod = start.slice(-2);
    const endPeriod = end.slice(-2);
    
    // If same period, show AM/PM only at the end
    if (startPeriod === endPeriod) {
      return `${start.slice(0, -3)} - ${end}`;
    }
    
    // Different periods, show both
    return `${start} - ${end}`;
  } catch (error) {
    console.error('Error formatting time range:', error);
    return 'Time not set';
  }
};

export const parseTime24to12 = (time24: string): string => {
  try {
    // Handle empty or invalid time
    if (!time24) return '';

    // Format 24-hour time (HH:MM) to 12-hour time (h:mm a)
    const [hours, minutes] = time24.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return '';
    
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);

    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error parsing time:', error);
    return time24; // Return original time if parsing fails
  }
};

export const formatDate = (dateString: string | Date): string => {
  try {
    // Handle empty date
    if (!dateString) return '';

    const date =
      typeof dateString === 'string'
        ? parse(dateString, 'yyyy-MM-dd', new Date())
        : dateString;
    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString); // Return original date if formatting fails
  }
};

export const combineDateTime = (date: Date, time: string): string => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours);
    combined.setMinutes(minutes);
    return combined.toISOString();
  } catch (error) {
    console.error('Error combining date and time:', error);
    throw error;
  }
};
