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

/**
 * Parses a date input into a local Date at midnight without timezone shift.
 * - If input is 'YYYY-MM-DD', constructs Date(year, monthIndex, day)
 * - If input is a Date, normalizes to local midnight of that date
 * - If input is another string format, attempts Date parsing and normalizes to local date
 */
export const parseDateToLocal = (dateInput: string | Date): Date => {
  if (dateInput instanceof Date) {
    return new Date(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate()
    );
  }
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      return new Date(y, (m as number) - 1, d as number);
    }
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      throw new Error('Invalid date string');
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  throw new Error('Invalid date input: must be Date or string');
};