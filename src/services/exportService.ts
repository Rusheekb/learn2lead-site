
import { ClassEvent } from "@/types/tutorTypes";
import { toast } from "sonner";
import Papa from 'papaparse';

export type ExportFormat = 'csv' | 'pdf';

export async function exportClassLogs(classes: ClassEvent[], format: ExportFormat): Promise<boolean> {
  try {
    if (format === 'csv') {
      return exportAsCSV(classes);
    } else if (format === 'pdf') {
      return exportAsPDF(classes);
    }
    return false;
  } catch (error) {
    console.error("Error exporting class logs:", error);
    toast.error("Failed to export class logs");
    return false;
  }
}

function exportAsCSV(classes: ClassEvent[]): boolean {
  try {
    // Transform classes to a flat structure for CSV
    const exportData = classes.map(cls => ({
      Title: cls.title,
      Subject: cls.subject,
      Tutor: cls.tutorName,
      Student: cls.studentName,
      Date: cls.date instanceof Date ? cls.date.toLocaleDateString() : cls.date,
      Time: `${cls.startTime} - ${cls.endTime}`,
      Status: cls.status,
      Attendance: cls.attendance,
      Notes: cls.notes || ''
    }));
    
    // Convert to CSV
    const csv = Papa.unparse(exportData);
    
    // Create a Blob and a download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `class-logs-${date}.csv`);
    document.body.appendChild(link);
    
    // Trigger download and clean up
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV exported successfully");
    return true;
  } catch (error) {
    console.error("Error exporting as CSV:", error);
    toast.error("Failed to export as CSV");
    return false;
  }
}

function exportAsPDF(classes: ClassEvent[]): boolean {
  // In a real application, this would use a PDF generation library
  toast.info("PDF export feature is coming soon");
  return false;
}

// Add these for compatibility with old imports
export const exportToCsv = exportAsCSV;
export const exportToPdf = exportAsPDF;
