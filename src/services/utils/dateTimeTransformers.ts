
import { parse, format, addMinutes } from "date-fns";

export const parseNumericString = (value: string | number | undefined): number => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  
  const parsed = parseFloat(value);
  if (!isNaN(parsed)) {
    return parsed;
  }
  
  return 0;
};

export const calculateEndTime = (startTime: string, durationHours: number): string => {
  if (!startTime || !durationHours) return "";
  
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return "";
    
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    
    const durationMinutes = durationHours * 60;
    const endDate = addMinutes(startDate, durationMinutes);
    
    return format(endDate, 'HH:mm');
  } catch (e: any) {
    console.error("Error calculating end time:", e);
    return "";
  }
};

export const parseDateWithFormats = (dateStr: string): Date => {
  const formats: string[] = [
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
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e: any) {
      continue;
    }
  }

  const fallbackDate = new Date(dateStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  throw new Error(`Cannot parse date string: ${dateStr}`);
};
