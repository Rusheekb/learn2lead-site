
export const formatTime = (timeString: string): string => {
  try {
    if (!timeString) return 'N/A';
    
    // Handle different time formats
    const cleanTime = timeString.trim().toLowerCase();
    
    // If time is already in 12-hour format with AM/PM
    if (cleanTime.includes('am') || cleanTime.includes('pm')) {
      return cleanTime.toUpperCase();
    }

    const [hourStr, minuteStr = '00'] = cleanTime.split(':');
    const hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);

    // Validate hour and minute
    if (isNaN(hour) || hour < 0 || hour > 23) return 'Invalid Time';
    if (isNaN(minute) || minute < 0 || minute > 59) return 'Invalid Time';
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.warn('Error formatting time:', timeString, error);
    return 'Invalid Time';
  }
};
