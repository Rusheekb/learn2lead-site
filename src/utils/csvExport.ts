import { ClassEvent } from '@/types/tutorTypes';

/**
 * Convert class logs to CSV format matching Excel template
 */
export const exportClassLogsToCSV = (classes: ClassEvent[]): void => {
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

  // Convert classes to CSV rows
  const rows = classes.map(cls => {
    const date = new Date(cls.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    return [
      cls.title || '',
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
      cls.studentPayment || '',
      cls.tutorPayment || '',
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
  
  const filename = `class-logs-${new Date().toISOString().split('T')[0]}.csv`;
  
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
