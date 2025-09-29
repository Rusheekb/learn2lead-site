/**
 * Safe date utilities to prevent timezone conversion issues
 * when working with date strings for database storage
 */

/**
 * Safely converts a Date object to YYYY-MM-DD format using local date components
 * This prevents timezone conversion issues that can cause date shifts
 */
export const formatDateForDatabase = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Ensures a date value is in the correct YYYY-MM-DD format for database storage
 * Handles both Date objects and string inputs
 */
export const ensureDateFormat = (dateInput: Date | string): string => {
  if (typeof dateInput === 'string') {
    // If it's already a string, validate it's in the correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // If it's a string but not in the right format, try to parse it
    const parsed = new Date(dateInput);
    return formatDateForDatabase(parsed);
  }
  
  if (dateInput instanceof Date) {
    return formatDateForDatabase(dateInput);
  }
  
  throw new Error('Invalid date input: must be Date object or string');
};

/**
 * Safe date formatter that handles both Date and string inputs
 * Specifically for ClassEvent.date which can be Date | string
 */
export const formatClassEventDate = (date: Date | string): string => {
  return ensureDateFormat(date);
};