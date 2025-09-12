export interface TutorStudentAssignment {
  id: string;
  tutor_id: string;
  student_id: string;
  subject: string | null;
  active: boolean;
  assigned_at: string;
}
