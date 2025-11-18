/**
 * Parse various time formats into consistent HH:MM 24-hour format
 */
export const parseStartTime = (timeStr: string): string => {
  if (!timeStr) return '';
  
  const cleaned = timeStr.trim();
  
  // Already in HH:MM format (e.g., "18:00", "6:00")
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Handle range format like "6-7pm" - extract start time
  const rangeMatch = cleaned.match(/^(\d{1,2})[-\s]?\d{1,2}?\s*(am|pm)?$/i);
  if (rangeMatch) {
    let hour = parseInt(rangeMatch[1]);
    const meridiem = rangeMatch[2]?.toLowerCase();
    
    // Convert to 24-hour if PM is specified
    if (meridiem === 'pm' && hour < 12) {
      hour += 12;
    } else if (meridiem === 'am' && hour === 12) {
      hour = 0;
    }
    
    return `${hour}:00`;
  }
  
  // Handle "6pm" or "6 PM" format
  const simpleMatch = cleaned.match(/^(\d{1,2})\s*(am|pm)?$/i);
  if (simpleMatch) {
    let hour = parseInt(simpleMatch[1]);
    const meridiem = simpleMatch[2]?.toLowerCase();
    
    if (meridiem === 'pm' && hour < 12) {
      hour += 12;
    } else if (meridiem === 'am' && hour === 12) {
      hour = 0;
    }
    
    return `${hour}:00`;
  }
  
  return '';
};
