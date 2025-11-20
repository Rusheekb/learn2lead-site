import { ClassEvent } from '@/types/tutorTypes';

/**
 * Convert class logs to CSV format matching Excel template
 * @param classes - Array of class events to export
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 */
export const exportClassLogsToCSV = (
  classes: ClassEvent[],
  startDate?: Date,
  endDate?: Date
): void => {
  // Filter by date range if provided
  let filteredClasses = classes;
  
  if (startDate || endDate) {
    filteredClasses = classes.filter(cls => {
      const classDate = new Date(cls.date);
      
      if (startDate && classDate < startDate) {
        return false;
      }
      
      if (endDate) {
        // Set end date to end of day for inclusive comparison
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (classDate > endOfDay) {
          return false;
        }
      }
      
      return true;
    });
  }
  // Define headers matching Excel template exactly
  const headers = [
    'Class Number',
    'Tutor Name',
    'Student Name',
    'Date',
    'Day',
    'Time (CST)',
    'Time (hrs)',
    'Subject',
    'Content',
    'HW',
    'Class Cost',
    'Tutor Cost',
    'Student Payment',
    'Tutor Payment',
    'Additional Info'
  ];

  // Convert filtered classes to CSV rows
  const rows = filteredClasses.map(cls => {
    const date = new Date(cls.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Format payment dates as M/d/yy or blank if no date
    const formatPaymentDate = (paymentDate: Date | null | undefined): string => {
      if (!paymentDate) return '';
      const d = new Date(paymentDate);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const year = d.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;
    };

    return [
      cls.classNumber || cls.title || '',
      cls.tutorName || '',
      cls.studentName || '',
      formattedDate,
      dayOfWeek,
      cls.startTime || '',
      cls.duration?.toString() || '',
      cls.subject || '',
      escapeCSVField(cls.content || ''),
      escapeCSVField(cls.homework || ''),
      cls.classCost?.toString() || '',
      cls.tutorCost?.toString() || '',
      formatPaymentDate(cls.studentPaymentDate),
      formatPaymentDate(cls.tutorPaymentDate),
      escapeCSVField(cls.notes || '')
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Create filename with date range if applicable
  let filename = 'class-logs';
  if (startDate && endDate) {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    filename = `class-logs-${startStr}-to-${endStr}`;
  } else {
    filename = `class-logs-${new Date().toISOString().split('T')[0]}`;
  }
  filename += '.csv';
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Escape CSV fields that contain commas, quotes, or newlines
 */
const escapeCSVField = (field: string): string => {
  if (!field) return '';
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
};
