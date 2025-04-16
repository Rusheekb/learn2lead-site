
import { parse, format, addMinutes } from "date-fns";

/**
 * Parse a string that should be a number
 */
export const parseNumericString = (value: string | number | undefined): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  
  // Try to parse as float first
  const parsed = parseFloat(value);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  // If not a valid number, return 0
  return 0;
};

/**
 * Calculate end time based on start time and duration
 */
export const calculateEndTime = (startTime: string, durationHours: number): string => {
  // Default return if inputs are invalid
  if (!startTime || !durationHours) return "";
  
  try {
    // Parse time in 24-hour format (e.g., "14:30")
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Invalid time parts
    if (isNaN(hours) || isNaN(minutes)) return "";
    
    // Create a date object for calculations (using today's date with the given time)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    
    // Calculate end time by adding duration in hours
    const durationMinutes = durationHours * 60;
    const endDate = addMinutes(startDate, durationMinutes);
    
    // Format as HH:MM
    return format(endDate, 'HH:mm');
  } catch (e) {
    console.error("Error calculating end time:", e);
    return "";
  }
};

/**
 * Try parsing date using various formats
 */
export const parseDateWithFormats = (dateStr: string): Date => {
  // Array of common date formats to try
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy/MM/dd',
    'dd-MMM-yyyy',
    'MMM dd, yyyy'
  ];

  for (const formatStr of formats) {
    try {
      const parsed = parse(dateStr, formatStr, new Date());
      // If valid date, return it
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e) {
      // Try next format
      continue;
    }
  }

  // If all formats fail, try JavaScript's built-in Date parsing
  const fallbackDate = new Date(dateStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  // If everything fails, throw an error
  throw new Error(`Cannot parse date string: ${dateStr}`);
};
