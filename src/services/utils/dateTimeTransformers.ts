
import { format, parse } from "date-fns";

/**
 * Parses a numeric string to a number, returning 0 if invalid
 */
export const parseNumericString = (value: string | null): number => {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculates end time based on start time and duration in hours
 */
export const calculateEndTime = (startTime: string, durationHrs: number): string => {
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

/**
 * Parse date string using multiple possible formats
 */
export const parseDateWithFormats = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Try multiple date formats to handle different possible formats
  const formats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yyyy'];
  
  for (const format of formats) {
    try {
      const dateObj = parse(dateStr, format, new Date());
      if (!isNaN(dateObj.getTime())) {
        return dateObj;
      }
    } catch (e) {
      // Continue trying other formats
    }
  }
  
  console.error('Failed to parse date with any format:', dateStr);
  return new Date(); // Fallback to current date
};
