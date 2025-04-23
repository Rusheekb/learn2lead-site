
import { parseISO, format, parse } from 'date-fns';

// Parse a string that may have a numeric value in it
export const parseNumericString = (value?: string | number): number => {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  // Remove non-numeric characters except decimal point
  const numericValue = value.replace(/[^0-9.]/g, '');
  
  return numericValue ? parseFloat(numericValue) : 0;
};

// Calculate end time based on start time and duration
export const calculateEndTime = (startTime: string, duration: number): string => {
  if (!startTime || !duration) {
    return '';
  }

  try {
    // Parse hours and minutes
    const [hoursStr, minutesStr] = startTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // Calculate hours and minutes for end time
    const durationHours = Math.floor(duration);
    const durationMinutes = Math.round((duration - durationHours) * 60);

    // Calculate total minutes
    let totalMinutes = minutes + durationMinutes;
    let totalHours = hours + durationHours;

    // Adjust for overflow
    if (totalMinutes >= 60) {
      totalHours += Math.floor(totalMinutes / 60);
      totalMinutes %= 60;
    }

    // Format to HH:MM
    return `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating end time:', error);
    return '';
  }
};

// Parse a date string using multiple possible formats
export const parseDateWithFormats = (dateString: string): Date => {
  // List of possible date formats to try
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'M/d/yyyy',
    'MMM d, yyyy',
    'MMMM d, yyyy',
    'yyyy-MM-dd\'T\'HH:mm:ss.SSSX',
  ];

  // Try ISO format first
  try {
    const date = parseISO(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Continue to next approach
  }

  // Try each format
  for (const formatString of formats) {
    try {
      const date = parse(dateString, formatString, new Date());
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Try next format
    }
  }

  // If all parsing attempts fail, throw error
  throw new Error(`Unable to parse date: ${dateString}`);
};
