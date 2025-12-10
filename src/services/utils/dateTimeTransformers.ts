
import { parseISO, format, parse } from 'date-fns';
import { parseNumericString } from '@/utils/numberUtils';

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
// IMPORTANT: Parses dates as LOCAL time to avoid timezone shifts
export const parseDateWithFormats = (dateString: string): Date => {
  // Handle YYYY-MM-DD format as local time (not UTC)
  // This prevents the date from shifting back a day due to timezone conversion
  const isoDateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // List of possible date formats to try
  const formats = [
    'MM/dd/yyyy',
    'M/d/yyyy',
    'MMM d, yyyy',
    'MMMM d, yyyy',
  ];

  // Try each format using parse (treats as local time)
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

  // Try ISO format with time component last (these should keep their timezone info)
  try {
    const date = parseISO(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Continue
  }

  // If all parsing attempts fail, throw error
  throw new Error(`Unable to parse date: ${dateString}`);
};
