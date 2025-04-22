import { format } from 'date-fns';

export const formatTime = (time: string): string => {
  try {
    // Handle empty or invalid time
    if (!time) return '';

    // Format 24-hour time (HH:MM) to 12-hour time (h:MM AM/PM)
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);

    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return time; // Return original time if formatting fails
  }
};

export const parseTime24to12 = (time24: string): string => {
  try {
    // Handle empty or invalid time
    if (!time24) return '';

    // Format 24-hour time (HH:MM) to 12-hour time (h:MM AM/PM)
    const [hours, minutes] = time24.split(':').map(Number);
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
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString); // Return original date if formatting fails
  }
};
