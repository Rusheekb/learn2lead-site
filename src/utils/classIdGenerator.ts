/**
 * Generates a unique alphanumeric class ID in the format:
 * {student_initials}-{tutor_initials}-{YYYYMMDD}-{sequence}
 * 
 * Example: SM-JD-20241119-1
 */

interface ClassIdParams {
  studentName: string;
  tutorName: string;
  date: Date | string;
  existingIds?: string[];
}

/**
 * Extracts initials from a name (first letter of first and last name)
 */
export function getInitials(name: string): string {
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/);
  
  if (parts.length === 1) {
    // Single name - take first two letters
    return cleaned.substring(0, 2).toUpperCase();
  }
  
  // Take first letter of first name and first letter of last name
  const firstInitial = parts[0][0] || '';
  const lastInitial = parts[parts.length - 1][0] || '';
  
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Formats date as YYYYMMDD
 */
export function formatDateForId(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

/**
 * Generates the base ID without sequence number
 */
function generateBaseId(params: ClassIdParams): string {
  const studentInitials = getInitials(params.studentName);
  const tutorInitials = getInitials(params.tutorName);
  const formattedDate = formatDateForId(params.date);
  
  return `${studentInitials}-${tutorInitials}-${formattedDate}`;
}

/**
 * Determines the next sequence number for a given base ID
 */
function getNextSequence(baseId: string, existingIds: string[]): number {
  const pattern = new RegExp(`^${baseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  
  const sequences = existingIds
    .map(id => {
      const match = id.match(pattern);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(seq => seq > 0);
  
  return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
}

/**
 * Generates a unique class ID
 * 
 * @param params - Parameters including student name, tutor name, date, and optional existing IDs
 * @returns A unique class ID in the format: XX-YY-YYYYMMDD-N
 */
export function generateClassId(params: ClassIdParams): string {
  const baseId = generateBaseId(params);
  const sequence = getNextSequence(baseId, params.existingIds || []);
  
  return `${baseId}-${sequence}`;
}

/**
 * Validates if a string matches the class ID format
 */
export function isValidClassId(id: string): boolean {
  // Pattern: 2 letters - 2 letters - 8 digits - 1+ digits
  const pattern = /^[A-Z]{2}-[A-Z]{2}-\d{8}-\d+$/;
  return pattern.test(id);
}

/**
 * Parses a class ID into its components
 */
export function parseClassId(id: string): {
  studentInitials: string;
  tutorInitials: string;
  date: string;
  sequence: number;
} | null {
  if (!isValidClassId(id)) {
    return null;
  }
  
  const parts = id.split('-');
  return {
    studentInitials: parts[0],
    tutorInitials: parts[1],
    date: parts[2],
    sequence: parseInt(parts[3], 10),
  };
}
