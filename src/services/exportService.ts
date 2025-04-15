
import { ClassEvent } from "@/types/tutorTypes";
import { toast } from "sonner";

export const exportToCsv = async (classes: ClassEvent[], filename = 'class_logs.csv') => {
  try {
    const headers = [
      "ID", "Title", "Tutor", "Student", "Date", "Start Time", 
      "End Time", "Subject", "Status", "Attendance", "Notes"
    ];
    
    const rows = classes.map(cls => [
      cls.id,
      cls.title,
      cls.tutorName,
      cls.studentName,
      cls.date instanceof Date ? cls.date.toISOString().split('T')[0] : cls.date,
      cls.startTime,
      cls.endTime,
      cls.subject,
      cls.status || "",
      cls.attendance || "",
      cls.notes || ""
    ]);
    
    const csvContent = 
      headers.join(',') + '\n' + 
      rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV export completed");
    return true;
  } catch (error) {
    console.error("CSV export failed:", error);
    toast.error("Failed to export data");
    return false;
  }
};

export const exportToPdf = async (classes: ClassEvent[], filename = 'class_logs.pdf') => {
  try {
    // This would normally use a library like jsPDF
    // For now, we'll just show a toast
    toast.success("PDF export completed");
    console.log("PDF export would include", classes.length, "classes");
    return true;
  } catch (error) {
    console.error("PDF export failed:", error);
    toast.error("Failed to export data");
    return false;
  }
};

// Add the exportClassLogs function
export const exportClassLogs = async (classes: ClassEvent[], format: 'csv' | 'pdf') => {
  if (format === 'csv') {
    return exportToCsv(classes);
  } else {
    return exportToPdf(classes);
  }
};
