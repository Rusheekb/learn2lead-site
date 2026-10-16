export type AppRole = 'student' | 'tutor' | 'admin' | 'parent';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  bio: string | null;
  avatar_url: string | null;
  zoom_link: string | null;
  /** Unique sign-in name (lowercase). */
  username?: string;
  /** A parent set this student's password; they must choose their own. */
  must_change_password?: boolean;
  /** Added by a parent (family accounts). */
  managed?: boolean;
  created_at: string;
  updated_at: string;
}
