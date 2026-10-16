/** A student a parent is linked to (see get_my_children). */
export interface FamilyChild {
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  /** The child's own address for class emails (null = parent only). */
  email: string | null;
  timezone: string | null;
  /** Added by the parent (no login of their own). */
  managed: boolean;
  linkedAt: string;
  /** Whether the student may see the family's hours remaining. */
  hoursVisible: boolean;
  /** Their username (works on the login page). */
  username: string;
}

/** A parent's view of a student's sign-in. */
export interface StudentLoginStatus {
  username: string;
  managed: boolean;
  hasPassword: boolean;
  disabled: boolean;
  mustChangePassword: boolean;
  lastSignInAt: string | null;
}

export interface FamilyHoursEntry {
  id: string;
  createdAt: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  studentFirstName: string | null;
}

/** An invite a student sent to the signed-in parent's email. */
export interface PendingGuardianInvite {
  token: string;
  studentFirstName: string;
  studentLastName: string;
  createdAt: string;
  expiresAt: string;
}

/** A student's view of their family link (get_my_family_status). */
export interface MyFamilyStatus {
  guardian: { firstName: string; lastName: string; email: string } | null;
  pendingInvite: { email: string; createdAt: string; expiresAt: string } | null;
}

export interface NewChildInput {
  firstName: string;
  lastName: string;
  grade?: string;
  email?: string;
}

export interface ConvertToFamilyInput {
  accountId: string;
  parentFirstName: string;
  parentLastName: string;
  childFirstName: string;
  childLastName: string;
}

/** What a conversion would move (admin dry run). */
export interface ConversionPreview {
  tutor_assignments: number;
  scheduled_classes: number;
  past_unlogged_classes: number;
  class_logs: number;
  tutor_notes: number;
  shared_files: number;
  hours_balance: number | null;
}
