
import { saveAs } from 'file-saver';
import * as Papa from 'papaparse';
import { ExportFormat } from '@/types/classTypes';
import { ClassEvent } from '@/types/tutorTypes';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ExportableClassData {
  Title: string;
  Subject: string;
  'Tutor Name': string;
  'Student Name': string;
  Date: string;
  'Start Time': string;
  'End Time': string;
  Status: string | undefined;
  Attendance: string | undefined;
  'Zoom Link': string | null;
  Notes: string | null;
}

// Helper function to format class data for export
const prepareClassDataForExport = (
  classes: ClassEvent[]
): ExportableClassData[] => {
  return classes.map((cls) => ({
    Title: cls.title,
    Subject: cls.subject,
    'Tutor Name': cls.tutorName,
    'Student Name': cls.studentName,
    Date:
      cls.date instanceof Date
        ? cls.date.toISOString().split('T')[0]
        : String(cls.date),
    'Start Time': cls.startTime,
    'End Time': cls.endTime,
    Status: cls.status,
    Attendance: cls.attendance,
    'Zoom Link': cls.zoomLink,
    Notes: cls.notes,
  }));
};

// Export as CSV
const exportCSV = async (
  classes: ClassEvent[],
  filename = 'class-logs'
): Promise<boolean> => {
  try {
    const data = prepareClassDataForExport(classes);
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    toast.error('Failed to export as CSV');
    return false;
  }
};

// Export as PDF
const exportPDF = async (
  classes: ClassEvent[],
  filename = 'class-logs'
): Promise<boolean> => {
  try {
    // @ts-ignore - jsPDF types are not perfect with autotable plugin
    const doc = new jsPDF();
    const data = prepareClassDataForExport(classes);

    // Convert object to array for jsPDF-AutoTable
    const tableData = data.map((item) => [
      item.Title,
      item.Subject,
      item['Tutor Name'],
      item['Student Name'],
      item.Date,
      item['Start Time'],
      item['End Time'],
      item.Status,
      item.Attendance,
    ]);

    const headers = [
      'Title',
      'Subject',
      'Tutor',
      'Student',
      'Date',
      'Start',
      'End',
      'Status',
      'Attendance',
    ];

    // @ts-ignore - jsPDF types are not perfect with autotable plugin
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 20,
      margin: { top: 30 },
      styles: { overflow: 'linebreak' },
      headStyles: { fillColor: [41, 128, 185] },
      didDrawPage: (data: any) => {
        // Add title
        doc.setFontSize(18);
        doc.text('Class Logs Report', 14, 15);

        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 23);
      },
    });

    // Save the PDF
    doc.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    toast.error('Failed to export as PDF');
    return false;
  }
};

// Main export function
export const exportClassLogs = async (
  classes: ClassEvent[],
  format: ExportFormat = 'csv'
): Promise<boolean> => {
  try {
    if (format === 'csv') {
      return await exportCSV(classes);
    } else if (format === 'pdf') {
      return await exportPDF(classes);
    }
    return false;
  } catch (error) {
    console.error(`Error exporting as ${format}:`, error);
    toast.error(`Failed to export as ${format}`);
    return false;
  }
};
