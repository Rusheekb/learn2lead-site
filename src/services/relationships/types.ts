
export interface TutorStudentRelationship {
  id: string;
  tutor_id: string;
  student_id: string;
  subject?: string;
  assigned_at: string;
  assigned_by: string | null;
  active: boolean;
}
