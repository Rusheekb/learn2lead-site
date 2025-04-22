
import { supabase } from "@/integrations/supabase/client";
import { ClassEvent } from "@/types/tutorTypes";
import { Student } from "@/types/sharedTypes";
import { transformDbRecordToClassEvent } from "./utils/classEventMapper";

// Fetch unique tutors from class logs
export const fetchTutors = async () => {
  const { data, error } = await supabase
    .from('class_logs')
    .select('Tutor Name')
    .order('Tutor Name')
    .not('Tutor Name', 'is', null);
  
  if (error) {
    console.error("Error fetching tutors:", error);
    return [];
  }
  
  // Extract unique tutor names
  const uniqueTutors = Array.from(new Set(data.map(record => (record as Record<string, string>)['Tutor Name'])))
    .filter(Boolean)
    .sort();
  
  // Transform to tutor objects
  return uniqueTutors.map(name => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`, // Generate placeholder email
    subjects: [], // Will be populated from class logs
    rating: 0,
    classes: 0,
    hourlyRate: 0
  }));
};

// Fetch unique students from class logs
export const fetchStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('class_logs')
    .select('Student Name, Subject, Date')
    .order('Student Name')
    .not('Student Name', 'is', null);
  
  if (error) {
    console.error("Error fetching students:", error);
    return [];
  }
  
  // Group by student name to collect all subjects and find last session
  const studentMap = new Map();
  
  data.forEach(record => {
    const name = (record as Record<string, string>)['Student Name'];
    if (!name) return;
    
    // Safely access properties
    const subject = (record as Record<string, string>)['Subject'] || '';
    const date = (record as Record<string, string>)['Date'] || '';
    
    if (!studentMap.has(name)) {
      studentMap.set(name, {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        subjects: new Set(),
        lastSession: date,
        nextSession: "",
        progress: ""
      });
    } else {
      const student = studentMap.get(name);
      
      // Add subject if not already in the set and it exists
      if (subject) {
        student.subjects.add(subject);
      }
      
      // Update last session if this one is more recent
      if (date && (!student.lastSession || new Date(date) > new Date(student.lastSession))) {
        student.lastSession = date;
      }
    }
  });
  
  // Convert the map to an array and prepare for return
  return Array.from(studentMap.values()).map(student => ({
    ...student,
    subjects: Array.from(student.subjects)
  }));
};

// Fetch payments data from class logs
export const fetchPaymentsData = async () => {
  const { data, error } = await supabase
    .from('class_logs')
    .select(`
      "Class Number",
      "Tutor Name", 
      "Student Name", 
      "Date", 
      "Class Cost", 
      "Tutor Cost", 
      "Student Payment", 
      "Tutor Payment"
    `)
    .order('Date', { ascending: false });
  
  if (error) {
    console.error("Error fetching payments data:", error);
    return [];
  }
  
  return data.map(record => ({
    id: `${(record as Record<string, string>)['Class Number'] || ''}`,
    date: (record as Record<string, string>)['Date'] || '',
    tutorName: (record as Record<string, string>)['Tutor Name'] || '',
    studentName: (record as Record<string, string>)['Student Name'] || '',
    classCost: parseFloat((record as Record<string, string>)['Class Cost'] || '0'),
    tutorCost: parseFloat((record as Record<string, string>)['Tutor Cost'] || '0'),
    studentPaymentStatus: (record as Record<string, string>)['Student Payment'] || 'Pending',
    tutorPaymentStatus: (record as Record<string, string>)['Tutor Payment'] || 'Pending'
  }));
};

// Calculate various metrics for dashboard widgets
export const calculateMetrics = (classes: ClassEvent[]) => {
  const totalClasses = classes.length;
  const uniqueStudents = new Set(classes.map(cls => cls.studentName)).size;
  const uniqueTutors = new Set(classes.map(cls => cls.tutorName)).size;
  
  // Calculate total revenue and costs
  const totalRevenue = classes.reduce((sum, cls) => sum + (cls.classCost || 0), 0);
  const totalCosts = classes.reduce((sum, cls) => sum + (cls.tutorCost || 0), 0);
  
  // Calculate subject popularity
  const subjectCounts = classes.reduce((acc, cls) => {
    if (cls.subject) {
      acc[cls.subject] = (acc[cls.subject] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const popularSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalClasses,
    uniqueStudents,
    uniqueTutors,
    totalRevenue,
    totalCosts,
    netIncome: totalRevenue - totalCosts,
    popularSubjects
  };
};
